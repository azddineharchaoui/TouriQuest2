"""
A/B testing framework for recommendation experiments.
"""
import asyncio
import hashlib
import json
import random
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import redis
import pandas as pd
import numpy as np
from scipy import stats
import logging

from app.models.schemas import (
    ABTestExperiment,
    UserExperimentAssignment,
    ExperimentGroup,
    RecommendationRequest,
    RecommendationResponse
)

logger = logging.getLogger(__name__)


class ExperimentStatus(str, Enum):
    """Experiment status values."""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MetricType(str, Enum):
    """Types of metrics to track in experiments."""
    CLICK_THROUGH_RATE = "click_through_rate"
    CONVERSION_RATE = "conversion_rate"
    ENGAGEMENT_TIME = "engagement_time"
    BOOKING_RATE = "booking_rate"
    REVENUE_PER_USER = "revenue_per_user"
    RECOMMENDATION_RELEVANCE = "recommendation_relevance"
    USER_SATISFACTION = "user_satisfaction"


class ABTestingFramework:
    """A/B testing framework for recommendation experiments."""
    
    def __init__(self, redis_url: str = "redis://localhost:6379/1"):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.experiments = {}
        self.user_assignments = {}
        self.experiment_metrics = {}
        
    async def create_experiment(self, experiment_config: Dict[str, Any]) -> str:
        """Create a new A/B test experiment."""
        experiment_id = self._generate_experiment_id(experiment_config['name'])
        
        experiment = ABTestExperiment(
            experiment_id=experiment_id,
            name=experiment_config['name'],
            description=experiment_config['description'],
            start_date=datetime.fromisoformat(experiment_config['start_date']),
            end_date=datetime.fromisoformat(experiment_config.get('end_date')) if experiment_config.get('end_date') else None,
            traffic_allocation=experiment_config['traffic_allocation'],
            success_metrics=experiment_config['success_metrics'],
            metadata=experiment_config.get('metadata', {})
        )
        
        # Store experiment configuration
        await self._store_experiment(experiment)
        
        # Initialize experiment metrics
        await self._initialize_experiment_metrics(experiment_id)
        
        logger.info(f"Created experiment: {experiment_id}")
        return experiment_id
    
    async def assign_user_to_experiment(self, user_id: str, experiment_id: str) -> ExperimentGroup:
        """Assign a user to an experiment group."""
        # Check if user is already assigned
        assignment_key = f"assignment:{experiment_id}:{user_id}"
        existing_assignment = self.redis_client.get(assignment_key)
        
        if existing_assignment:
            return ExperimentGroup(existing_assignment)
        
        # Get experiment configuration
        experiment = await self._get_experiment(experiment_id)
        if not experiment or not experiment.is_active:
            return ExperimentGroup.CONTROL
        
        # Assign user to group using consistent hashing
        group = self._assign_to_group(user_id, experiment.traffic_allocation)
        
        # Store assignment
        assignment = UserExperimentAssignment(
            user_id=user_id,
            experiment_id=experiment_id,
            group=group,
            assigned_at=datetime.now()
        )
        
        await self._store_user_assignment(assignment)
        
        logger.debug(f"Assigned user {user_id} to group {group} in experiment {experiment_id}")
        return group
    
    async def get_user_experiments(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all active experiments for a user."""
        active_experiments = await self._get_active_experiments()
        user_experiments = []
        
        for experiment in active_experiments:
            group = await self.assign_user_to_experiment(user_id, experiment.experiment_id)
            user_experiments.append({
                'experiment_id': experiment.experiment_id,
                'group': group,
                'experiment_name': experiment.name
            })
        
        return user_experiments
    
    async def track_metric(self, user_id: str, experiment_id: str, metric_type: MetricType, value: float, context: Dict[str, Any] = None):
        """Track a metric for an experiment."""
        try:
            # Get user's experiment group
            assignment = await self._get_user_assignment(user_id, experiment_id)
            if not assignment:
                return
            
            # Store metric data
            metric_data = {
                'user_id': user_id,
                'experiment_id': experiment_id,
                'group': assignment.group,
                'metric_type': metric_type,
                'value': value,
                'timestamp': datetime.now().isoformat(),
                'context': context or {}
            }
            
            await self._store_metric(metric_data)
            
            # Update aggregated metrics
            await self._update_aggregated_metrics(experiment_id, assignment.group, metric_type, value)
            
        except Exception as e:
            logger.error(f"Error tracking metric: {str(e)}")
    
    async def get_experiment_results(self, experiment_id: str) -> Dict[str, Any]:
        """Get comprehensive results for an experiment."""
        experiment = await self._get_experiment(experiment_id)
        if not experiment:
            raise ValueError(f"Experiment {experiment_id} not found")
        
        # Get metrics for all groups
        group_metrics = {}
        
        for group in ExperimentGroup:
            metrics = await self._get_group_metrics(experiment_id, group)
            if metrics:
                group_metrics[group] = metrics
        
        # Calculate statistical significance
        significance_results = await self._calculate_statistical_significance(experiment_id, group_metrics)
        
        # Generate summary
        summary = self._generate_experiment_summary(experiment, group_metrics, significance_results)
        
        return {
            'experiment': experiment.dict(),
            'group_metrics': group_metrics,
            'statistical_significance': significance_results,
            'summary': summary
        }
    
    async def stop_experiment(self, experiment_id: str, reason: str = "Manual stop") -> bool:
        """Stop an active experiment."""
        try:
            experiment = await self._get_experiment(experiment_id)
            if not experiment:
                return False
            
            # Update experiment status
            experiment.is_active = False
            experiment.metadata['stopped_at'] = datetime.now().isoformat()
            experiment.metadata['stop_reason'] = reason
            
            await self._store_experiment(experiment)
            
            logger.info(f"Stopped experiment {experiment_id}: {reason}")
            return True
            
        except Exception as e:
            logger.error(f"Error stopping experiment: {str(e)}")
            return False
    
    def _generate_experiment_id(self, name: str) -> str:
        """Generate unique experiment ID."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        name_hash = hashlib.md5(name.encode()).hexdigest()[:8]
        return f"exp_{timestamp}_{name_hash}"
    
    def _assign_to_group(self, user_id: str, traffic_allocation: Dict[ExperimentGroup, float]) -> ExperimentGroup:
        """Assign user to experiment group using consistent hashing."""
        # Use hash of user_id for consistent assignment
        hash_value = int(hashlib.md5(user_id.encode()).hexdigest(), 16) % 10000
        normalized_hash = hash_value / 10000
        
        # Assign based on traffic allocation
        cumulative_probability = 0.0
        
        for group, allocation in traffic_allocation.items():
            cumulative_probability += allocation
            if normalized_hash <= cumulative_probability:
                return group
        
        # Default to control if no group assigned
        return ExperimentGroup.CONTROL
    
    async def _store_experiment(self, experiment: ABTestExperiment):
        """Store experiment configuration in Redis."""
        key = f"experiment:{experiment.experiment_id}"
        data = experiment.dict()
        data['start_date'] = data['start_date'].isoformat() if data['start_date'] else None
        data['end_date'] = data['end_date'].isoformat() if data['end_date'] else None
        
        self.redis_client.set(key, json.dumps(data, default=str))
    
    async def _get_experiment(self, experiment_id: str) -> Optional[ABTestExperiment]:
        """Get experiment configuration from Redis."""
        key = f"experiment:{experiment_id}"
        data = self.redis_client.get(key)
        
        if data:
            experiment_data = json.loads(data)
            if experiment_data['start_date']:
                experiment_data['start_date'] = datetime.fromisoformat(experiment_data['start_date'])
            if experiment_data['end_date']:
                experiment_data['end_date'] = datetime.fromisoformat(experiment_data['end_date'])
            
            return ABTestExperiment(**experiment_data)
        
        return None
    
    async def _store_user_assignment(self, assignment: UserExperimentAssignment):
        """Store user assignment in Redis."""
        key = f"assignment:{assignment.experiment_id}:{assignment.user_id}"
        data = assignment.dict()
        data['assigned_at'] = data['assigned_at'].isoformat()
        
        # Store with TTL based on experiment duration
        ttl = 86400 * 30  # 30 days default
        self.redis_client.setex(key, ttl, json.dumps(data, default=str))
    
    async def _get_user_assignment(self, user_id: str, experiment_id: str) -> Optional[UserExperimentAssignment]:
        """Get user assignment from Redis."""
        key = f"assignment:{experiment_id}:{user_id}"
        data = self.redis_client.get(key)
        
        if data:
            assignment_data = json.loads(data)
            assignment_data['assigned_at'] = datetime.fromisoformat(assignment_data['assigned_at'])
            return UserExperimentAssignment(**assignment_data)
        
        return None
    
    async def _get_active_experiments(self) -> List[ABTestExperiment]:
        """Get all active experiments."""
        pattern = "experiment:*"
        keys = self.redis_client.keys(pattern)
        
        active_experiments = []
        
        for key in keys:
            experiment = await self._get_experiment(key.split(":")[-1])
            if experiment and experiment.is_active:
                # Check if experiment is within date range
                now = datetime.now()
                if experiment.start_date <= now:
                    if not experiment.end_date or experiment.end_date >= now:
                        active_experiments.append(experiment)
        
        return active_experiments
    
    async def _store_metric(self, metric_data: Dict[str, Any]):
        """Store metric data in Redis."""
        key = f"metric:{metric_data['experiment_id']}:{metric_data['group']}:{metric_data['metric_type']}:{datetime.now().timestamp()}"
        self.redis_client.setex(key, 86400 * 7, json.dumps(metric_data, default=str))  # Store for 7 days
    
    async def _initialize_experiment_metrics(self, experiment_id: str):
        """Initialize aggregated metrics for an experiment."""
        for group in ExperimentGroup:
            for metric_type in MetricType:
                key = f"agg_metric:{experiment_id}:{group}:{metric_type}"
                initial_data = {
                    'count': 0,
                    'sum': 0.0,
                    'sum_squares': 0.0,
                    'mean': 0.0,
                    'variance': 0.0
                }
                self.redis_client.set(key, json.dumps(initial_data))
    
    async def _update_aggregated_metrics(self, experiment_id: str, group: ExperimentGroup, metric_type: MetricType, value: float):
        """Update aggregated metrics incrementally."""
        key = f"agg_metric:{experiment_id}:{group}:{metric_type}"
        
        # Get current aggregated data
        current_data = self.redis_client.get(key)
        if current_data:
            agg_data = json.loads(current_data)
        else:
            agg_data = {'count': 0, 'sum': 0.0, 'sum_squares': 0.0, 'mean': 0.0, 'variance': 0.0}
        
        # Update aggregated statistics
        old_count = agg_data['count']
        new_count = old_count + 1
        
        old_mean = agg_data['mean']
        new_sum = agg_data['sum'] + value
        new_mean = new_sum / new_count
        
        new_sum_squares = agg_data['sum_squares'] + value * value
        
        if new_count > 1:
            new_variance = (new_sum_squares - new_count * new_mean * new_mean) / (new_count - 1)
        else:
            new_variance = 0.0
        
        # Store updated aggregated data
        updated_data = {
            'count': new_count,
            'sum': new_sum,
            'sum_squares': new_sum_squares,
            'mean': new_mean,
            'variance': max(0.0, new_variance)  # Ensure non-negative variance
        }
        
        self.redis_client.set(key, json.dumps(updated_data))
    
    async def _get_group_metrics(self, experiment_id: str, group: ExperimentGroup) -> Dict[str, Dict[str, float]]:
        """Get aggregated metrics for an experiment group."""
        group_metrics = {}
        
        for metric_type in MetricType:
            key = f"agg_metric:{experiment_id}:{group}:{metric_type}"
            data = self.redis_client.get(key)
            
            if data:
                metric_data = json.loads(data)
                if metric_data['count'] > 0:
                    group_metrics[metric_type] = {
                        'count': metric_data['count'],
                        'mean': metric_data['mean'],
                        'variance': metric_data['variance'],
                        'std_dev': np.sqrt(metric_data['variance']),
                        'std_error': np.sqrt(metric_data['variance'] / metric_data['count']) if metric_data['count'] > 0 else 0
                    }
        
        return group_metrics
    
    async def _calculate_statistical_significance(self, experiment_id: str, group_metrics: Dict[ExperimentGroup, Dict]) -> Dict[str, Dict]:
        """Calculate statistical significance between experiment groups."""
        significance_results = {}
        
        # Compare each variant against control
        control_metrics = group_metrics.get(ExperimentGroup.CONTROL, {})
        
        for group in [ExperimentGroup.VARIANT_A, ExperimentGroup.VARIANT_B, ExperimentGroup.VARIANT_C]:
            if group not in group_metrics:
                continue
                
            variant_metrics = group_metrics[group]
            group_comparisons = {}
            
            for metric_type in MetricType:
                if metric_type in control_metrics and metric_type in variant_metrics:
                    control_data = control_metrics[metric_type]
                    variant_data = variant_metrics[metric_type]
                    
                    # Perform t-test
                    t_stat, p_value = self._perform_t_test(control_data, variant_data)
                    
                    # Calculate effect size (Cohen's d)
                    effect_size = self._calculate_effect_size(control_data, variant_data)
                    
                    # Determine significance
                    is_significant = p_value < 0.05
                    
                    group_comparisons[metric_type] = {
                        't_statistic': t_stat,
                        'p_value': p_value,
                        'is_significant': is_significant,
                        'effect_size': effect_size,
                        'control_mean': control_data['mean'],
                        'variant_mean': variant_data['mean'],
                        'relative_change': ((variant_data['mean'] - control_data['mean']) / control_data['mean'] * 100) if control_data['mean'] != 0 else 0
                    }
            
            significance_results[group] = group_comparisons
        
        return significance_results
    
    def _perform_t_test(self, control_data: Dict, variant_data: Dict) -> Tuple[float, float]:
        """Perform Welch's t-test for unequal variances."""
        if control_data['count'] < 2 or variant_data['count'] < 2:
            return 0.0, 1.0
        
        # Calculate t-statistic for Welch's t-test
        mean_diff = variant_data['mean'] - control_data['mean']
        
        control_se = control_data['variance'] / control_data['count']
        variant_se = variant_data['variance'] / variant_data['count']
        
        pooled_se = np.sqrt(control_se + variant_se)
        
        if pooled_se == 0:
            return 0.0, 1.0
        
        t_stat = mean_diff / pooled_se
        
        # Calculate degrees of freedom (Welch-Satterthwaite equation)
        numerator = (control_se + variant_se) ** 2
        denominator = (control_se ** 2 / (control_data['count'] - 1)) + (variant_se ** 2 / (variant_data['count'] - 1))
        
        if denominator == 0:
            df = min(control_data['count'], variant_data['count']) - 1
        else:
            df = numerator / denominator
        
        # Calculate p-value (two-tailed)
        p_value = 2 * (1 - stats.t.cdf(abs(t_stat), df))
        
        return float(t_stat), float(p_value)
    
    def _calculate_effect_size(self, control_data: Dict, variant_data: Dict) -> float:
        """Calculate Cohen's d effect size."""
        if control_data['count'] < 2 or variant_data['count'] < 2:
            return 0.0
        
        # Pooled standard deviation
        pooled_var = ((control_data['count'] - 1) * control_data['variance'] + 
                     (variant_data['count'] - 1) * variant_data['variance']) / \
                    (control_data['count'] + variant_data['count'] - 2)
        
        pooled_std = np.sqrt(pooled_var)
        
        if pooled_std == 0:
            return 0.0
        
        cohen_d = (variant_data['mean'] - control_data['mean']) / pooled_std
        return float(cohen_d)
    
    def _generate_experiment_summary(self, experiment: ABTestExperiment, 
                                   group_metrics: Dict[ExperimentGroup, Dict],
                                   significance_results: Dict[str, Dict]) -> Dict[str, Any]:
        """Generate experiment summary."""
        summary = {
            'experiment_name': experiment.name,
            'status': 'active' if experiment.is_active else 'stopped',
            'duration_days': (datetime.now() - experiment.start_date).days,
            'total_users': sum(
                sum(metric['count'] for metric in group_data.values()) 
                for group_data in group_metrics.values()
            ),
            'groups': {},
            'significant_results': []
        }
        
        # Summarize each group
        for group, metrics in group_metrics.items():
            if metrics:
                primary_metric = experiment.success_metrics[0] if experiment.success_metrics else 'click_through_rate'
                primary_data = metrics.get(primary_metric, {})
                
                summary['groups'][group] = {
                    'user_count': primary_data.get('count', 0),
                    'primary_metric_value': primary_data.get('mean', 0),
                    'confidence_interval': self._calculate_confidence_interval(primary_data)
                }
        
        # Identify significant results
        for group, comparisons in significance_results.items():
            for metric_type, result in comparisons.items():
                if result['is_significant']:
                    summary['significant_results'].append({
                        'group': group,
                        'metric': metric_type,
                        'p_value': result['p_value'],
                        'relative_change': result['relative_change'],
                        'effect_size': result['effect_size']
                    })
        
        return summary
    
    def _calculate_confidence_interval(self, metric_data: Dict, confidence_level: float = 0.95) -> Tuple[float, float]:
        """Calculate confidence interval for a metric."""
        if metric_data.get('count', 0) < 2:
            return (0.0, 0.0)
        
        mean = metric_data['mean']
        std_error = metric_data.get('std_error', 0)
        
        # Use t-distribution for small samples
        df = metric_data['count'] - 1
        t_critical = stats.t.ppf((1 + confidence_level) / 2, df)
        
        margin_error = t_critical * std_error
        
        return (mean - margin_error, mean + margin_error)


class RecommendationExperimentManager:
    """Manager for recommendation-specific A/B tests."""
    
    def __init__(self, ab_testing_framework: ABTestingFramework):
        self.ab_framework = ab_testing_framework
        
    async def create_algorithm_comparison_experiment(self, experiment_config: Dict[str, Any]) -> str:
        """Create experiment to compare recommendation algorithms."""
        return await self.ab_framework.create_experiment({
            'name': f"Algorithm Comparison: {experiment_config['name']}",
            'description': f"Comparing {experiment_config['algorithms']} algorithms",
            'start_date': experiment_config['start_date'],
            'end_date': experiment_config.get('end_date'),
            'traffic_allocation': {
                ExperimentGroup.CONTROL: 0.33,
                ExperimentGroup.VARIANT_A: 0.33,
                ExperimentGroup.VARIANT_B: 0.34
            },
            'success_metrics': [
                MetricType.CLICK_THROUGH_RATE,
                MetricType.CONVERSION_RATE,
                MetricType.RECOMMENDATION_RELEVANCE
            ],
            'metadata': {
                'experiment_type': 'algorithm_comparison',
                'algorithms': experiment_config['algorithms']
            }
        })
    
    async def modify_recommendations_for_experiment(self, user_id: str, recommendations: List[Dict], 
                                                  experiment_id: str) -> List[Dict]:
        """Modify recommendations based on experiment assignment."""
        user_group = await self.ab_framework.assign_user_to_experiment(user_id, experiment_id)
        
        experiment = await self.ab_framework._get_experiment(experiment_id)
        if not experiment:
            return recommendations
        
        experiment_type = experiment.metadata.get('experiment_type')
        
        if experiment_type == 'algorithm_comparison':
            return self._apply_algorithm_variant(recommendations, user_group, experiment.metadata)
        elif experiment_type == 'ranking_experiment':
            return self._apply_ranking_variant(recommendations, user_group)
        elif experiment_type == 'diversity_experiment':
            return self._apply_diversity_variant(recommendations, user_group)
        
        return recommendations
    
    def _apply_algorithm_variant(self, recommendations: List[Dict], group: ExperimentGroup, metadata: Dict) -> List[Dict]:
        """Apply algorithm-specific modifications."""
        algorithms = metadata.get('algorithms', ['collaborative_filtering', 'content_based', 'matrix_factorization'])
        
        if group == ExperimentGroup.CONTROL:
            # Use default hybrid approach
            return recommendations
        elif group == ExperimentGroup.VARIANT_A and len(algorithms) > 0:
            # Boost first algorithm's contributions
            return self._boost_algorithm_scores(recommendations, algorithms[0], 1.2)
        elif group == ExperimentGroup.VARIANT_B and len(algorithms) > 1:
            # Boost second algorithm's contributions
            return self._boost_algorithm_scores(recommendations, algorithms[1], 1.2)
        
        return recommendations
    
    def _apply_ranking_variant(self, recommendations: List[Dict], group: ExperimentGroup) -> List[Dict]:
        """Apply ranking modifications."""
        if group == ExperimentGroup.VARIANT_A:
            # Promote diversity in top positions
            return self._promote_diversity(recommendations)
        elif group == ExperimentGroup.VARIANT_B:
            # Promote popular items
            return self._promote_popularity(recommendations)
        
        return recommendations
    
    def _apply_diversity_variant(self, recommendations: List[Dict], group: ExperimentGroup) -> List[Dict]:
        """Apply diversity modifications."""
        if group == ExperimentGroup.VARIANT_A:
            # Increase diversity factor
            return self._increase_diversity(recommendations, factor=1.5)
        elif group == ExperimentGroup.VARIANT_B:
            # Decrease diversity factor (more personalized)
            return self._increase_diversity(recommendations, factor=0.7)
        
        return recommendations
    
    def _boost_algorithm_scores(self, recommendations: List[Dict], algorithm: str, boost_factor: float) -> List[Dict]:
        """Boost scores for specific algorithm contributions."""
        for rec in recommendations:
            if 'algorithm_contributions' in rec:
                algorithm_score = rec['algorithm_contributions'].get(algorithm, 0)
                if algorithm_score > 0:
                    rec['score'] = min(1.0, rec['score'] * boost_factor)
        
        # Re-sort by score
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return recommendations
    
    def _promote_diversity(self, recommendations: List[Dict]) -> List[Dict]:
        """Promote diverse recommendations."""
        # Simple diversity promotion - ensure different categories in top positions
        categories_seen = set()
        diverse_recs = []
        remaining_recs = []
        
        for rec in recommendations:
            category = rec.get('category', 'unknown')
            if category not in categories_seen and len(diverse_recs) < 5:
                categories_seen.add(category)
                diverse_recs.append(rec)
            else:
                remaining_recs.append(rec)
        
        return diverse_recs + remaining_recs
    
    def _promote_popularity(self, recommendations: List[Dict]) -> List[Dict]:
        """Promote popular recommendations."""
        # Boost scores for items with high review counts or ratings
        for rec in recommendations:
            if rec.get('review_count', 0) > 100 or rec.get('avg_rating', 0) > 4.5:
                rec['score'] = min(1.0, rec['score'] * 1.15)
        
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return recommendations
    
    def _increase_diversity(self, recommendations: List[Dict], factor: float) -> List[Dict]:
        """Adjust diversity in recommendations."""
        if factor > 1.0:
            # Increase diversity by promoting different categories
            return self._promote_diversity(recommendations)
        else:
            # Decrease diversity by keeping similar items together
            recommendations.sort(key=lambda x: (x.get('category', ''), -x['score']))
            return recommendations


# Global instances
ab_testing_framework = ABTestingFramework()
experiment_manager = RecommendationExperimentManager(ab_testing_framework)