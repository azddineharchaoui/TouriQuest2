"""Dynamic pricing service with intelligent pricing strategies"""

import asyncio
import uuid
from datetime import datetime, date, timedelta
from typing import Optional, Dict, List, Any, Tuple
from decimal import Decimal
from enum import Enum
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, update
from sqlalchemy.orm import joinedload, selectinload

from app.core.database import get_session
from app.models.property_management_models import (
    PropertyListing, PricingCalendar, PricingRule, PropertyCompetitorAnalysis,
    AvailabilityCalendar, PropertyAnalytics, PricingStrategy
)
from app.schemas.property_management_schemas import (
    PricingOptimizationRequest, PricingOptimizationResponse,
    PricingRecommendation, PricingRuleRequest, PricingRuleResponse
)
from app.services.cache_service import CacheService

logger = structlog.get_logger()


class DemandLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


class SeasonType(str, Enum):
    LOW = "low"
    SHOULDER = "shoulder"
    HIGH = "high"
    PEAK = "peak"


class DynamicPricingService:
    """Advanced dynamic pricing service with ML-based optimization"""
    
    def __init__(self, cache_service: Optional[CacheService] = None):
        self.cache = cache_service
        
        # Pricing configuration
        self.pricing_config = {
            "demand_multipliers": {
                DemandLevel.LOW: 0.85,
                DemandLevel.MEDIUM: 1.0,
                DemandLevel.HIGH: 1.25,
                DemandLevel.VERY_HIGH: 1.5
            },
            "seasonal_multipliers": {
                SeasonType.LOW: 0.80,
                SeasonType.SHOULDER: 0.95,
                SeasonType.HIGH: 1.15,
                SeasonType.PEAK: 1.4
            },
            "advance_booking_multipliers": {
                # Days in advance: multiplier
                0: 0.7,    # Last minute
                1: 0.8,    # Same day
                7: 0.9,    # 1 week
                30: 1.0,   # 1 month
                90: 1.05,  # 3 months
                180: 1.1   # 6 months
            },
            "occupancy_multipliers": {
                # Occupancy rate: multiplier
                0.0: 0.8,   # 0% occupancy
                0.5: 0.9,   # 50% occupancy
                0.7: 1.0,   # 70% occupancy
                0.8: 1.1,   # 80% occupancy
                0.9: 1.3,   # 90% occupancy
                0.95: 1.5   # 95% occupancy
            },
            "weekday_multipliers": {
                # 0=Monday, 6=Sunday
                0: 0.9,  # Monday
                1: 0.9,  # Tuesday
                2: 0.9,  # Wednesday
                3: 0.95, # Thursday
                4: 1.1,  # Friday
                5: 1.2,  # Saturday
                6: 1.15  # Sunday
            },
            "length_of_stay_discounts": {
                # Nights: discount percentage
                7: 0.05,   # 5% discount for 1 week
                14: 0.10,  # 10% discount for 2 weeks
                30: 0.15   # 15% discount for 1 month
            }
        }
    
    async def generate_pricing_recommendations(
        self,
        session: AsyncSession,
        request: PricingOptimizationRequest,
        host_id: str
    ) -> PricingOptimizationResponse:
        """Generate intelligent pricing recommendations"""
        try:
            # Verify property ownership
            property_listing = await self._verify_property_ownership(session, request.property_id, host_id)
            
            # Get historical data and market analysis
            historical_data = await self._get_historical_performance(session, request.property_id)
            market_data = await self._analyze_market_conditions(session, property_listing)
            competitor_data = await self._get_competitor_analysis(session, request.property_id)
            
            # Generate recommendations for each date
            recommendations = []
            current_date = request.start_date
            
            while current_date <= request.end_date:
                recommendation = await self._generate_date_recommendation(
                    session, property_listing, current_date, historical_data, 
                    market_data, competitor_data, request.optimization_goals
                )
                recommendations.append(recommendation)
                current_date += timedelta(days=1)
            
            # Generate summary
            summary = await self._generate_optimization_summary(
                recommendations, property_listing, request.optimization_goals
            )
            
            return PricingOptimizationResponse(
                property_id=request.property_id,
                optimization_period_start=request.start_date,
                optimization_period_end=request.end_date,
                recommendations=recommendations,
                summary=summary,
                generated_at=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Error generating pricing recommendations: {str(e)}")
            raise
    
    async def apply_dynamic_pricing(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str,
        date_range: Tuple[date, date],
        strategy: PricingStrategy = PricingStrategy.DYNAMIC
    ):
        """Apply dynamic pricing to property for specified date range"""
        try:
            # Verify ownership
            property_listing = await self._verify_property_ownership(session, property_id, host_id)
            
            # Get active pricing rules
            pricing_rules = await self._get_active_pricing_rules(session, property_id)
            
            # Apply pricing for each date
            start_date, end_date = date_range
            current_date = start_date
            
            while current_date <= end_date:
                # Calculate dynamic price
                dynamic_price = await self._calculate_dynamic_price(
                    session, property_listing, current_date, pricing_rules
                )
                
                # Update pricing calendar
                await self._update_pricing_calendar_entry(
                    session, property_id, current_date, dynamic_price
                )
                
                current_date += timedelta(days=1)
            
            await session.commit()
            
            # Clear cache
            if self.cache:
                await self.cache.invalidate_pattern(f"property:{property_id}:pricing:*")
            
            logger.info(f"Dynamic pricing applied to property {property_id}")
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error applying dynamic pricing: {str(e)}")
            raise
    
    async def create_pricing_rule(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str,
        rule_request: PricingRuleRequest
    ) -> PricingRuleResponse:
        """Create a new pricing rule"""
        try:
            # Verify ownership
            await self._verify_property_ownership(session, property_id, host_id)
            
            # Create pricing rule
            pricing_rule = PricingRule(
                id=str(uuid.uuid4()),
                property_id=property_id,
                rule_name=rule_request.rule_name,
                rule_type=rule_request.rule_type,
                conditions=rule_request.conditions,
                adjustment_type=rule_request.adjustment_type,
                adjustment_value=rule_request.adjustment_value,
                minimum_price=rule_request.minimum_price,
                maximum_price=rule_request.maximum_price,
                priority=rule_request.priority,
                is_active=rule_request.is_active
            )
            
            session.add(pricing_rule)
            await session.commit()
            
            logger.info(f"Pricing rule created: {pricing_rule.id}")
            
            return PricingRuleResponse(
                id=pricing_rule.id,
                rule_name=pricing_rule.rule_name,
                rule_type=pricing_rule.rule_type,
                conditions=pricing_rule.conditions,
                adjustment_type=pricing_rule.adjustment_type,
                adjustment_value=pricing_rule.adjustment_value,
                minimum_price=pricing_rule.minimum_price,
                maximum_price=pricing_rule.maximum_price,
                priority=pricing_rule.priority,
                is_active=pricing_rule.is_active,
                created_at=pricing_rule.created_at,
                updated_at=pricing_rule.updated_at
            )
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error creating pricing rule: {str(e)}")
            raise
    
    async def analyze_competitor_pricing(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str
    ) -> Dict[str, Any]:
        """Analyze competitor pricing for property"""
        try:
            # Verify ownership
            property_listing = await self._verify_property_ownership(session, property_id, host_id)
            
            # Get recent competitor analysis
            query = select(PropertyCompetitorAnalysis).where(
                and_(
                    PropertyCompetitorAnalysis.property_id == property_id,
                    PropertyCompetitorAnalysis.analysis_date >= datetime.utcnow() - timedelta(days=7)
                )
            ).order_by(PropertyCompetitorAnalysis.analysis_date.desc())
            
            result = await session.execute(query)
            competitor_analyses = result.scalars().all()
            
            if not competitor_analyses:
                # Perform new competitor analysis
                competitor_analyses = await self._perform_competitor_analysis(session, property_listing)
            
            # Analyze competitor data
            analysis_results = {
                "property_price": property_listing.base_price,
                "competitor_count": len(competitor_analyses),
                "price_comparison": {},
                "market_position": "competitive",
                "recommendations": []
            }
            
            if competitor_analyses:
                competitor_prices = [c.competitor_price for c in competitor_analyses if c.competitor_price]
                
                if competitor_prices:
                    avg_competitor_price = sum(competitor_prices) / len(competitor_prices)
                    min_competitor_price = min(competitor_prices)
                    max_competitor_price = max(competitor_prices)
                    
                    analysis_results["price_comparison"] = {
                        "average_competitor_price": float(avg_competitor_price),
                        "min_competitor_price": float(min_competitor_price),
                        "max_competitor_price": float(max_competitor_price),
                        "price_difference_from_average": float(property_listing.base_price - avg_competitor_price),
                        "price_difference_percentage": float((property_listing.base_price - avg_competitor_price) / avg_competitor_price * 100)
                    }
                    
                    # Determine market position
                    if property_listing.base_price > avg_competitor_price * 1.1:
                        analysis_results["market_position"] = "premium"
                        analysis_results["recommendations"].append("Consider lowering price to increase bookings")
                    elif property_listing.base_price < avg_competitor_price * 0.9:
                        analysis_results["market_position"] = "budget"
                        analysis_results["recommendations"].append("Consider raising price to increase revenue")
                    else:
                        analysis_results["market_position"] = "competitive"
                        analysis_results["recommendations"].append("Price is competitive with market")
            
            return analysis_results
            
        except Exception as e:
            logger.error(f"Error analyzing competitor pricing: {str(e)}")
            raise
    
    async def calculate_revenue_optimization(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str,
        date_range: Tuple[date, date],
        scenarios: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate revenue optimization scenarios"""
        try:
            # Verify ownership
            property_listing = await self._verify_property_ownership(session, property_id, host_id)
            
            # Get historical occupancy data
            historical_occupancy = await self._get_historical_occupancy(session, property_id, date_range)
            
            optimization_results = {
                "property_id": property_id,
                "analysis_period": {
                    "start_date": date_range[0].isoformat(),
                    "end_date": date_range[1].isoformat()
                },
                "scenarios": []
            }
            
            for scenario in scenarios:
                scenario_result = await self._analyze_pricing_scenario(
                    session, property_listing, date_range, scenario, historical_occupancy
                )
                optimization_results["scenarios"].append(scenario_result)
            
            # Find optimal scenario
            best_scenario = max(
                optimization_results["scenarios"], 
                key=lambda s: s["projected_revenue"]
            )
            optimization_results["recommended_scenario"] = best_scenario["scenario_name"]
            
            return optimization_results
            
        except Exception as e:
            logger.error(f"Error calculating revenue optimization: {str(e)}")
            raise
    
    async def get_seasonal_pricing_suggestions(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str,
        year: int
    ) -> Dict[str, Any]:
        """Get seasonal pricing suggestions for the year"""
        try:
            # Verify ownership
            property_listing = await self._verify_property_ownership(session, property_id, host_id)
            
            # Define seasonal periods (this would be location-specific in production)
            seasonal_periods = self._get_seasonal_periods(property_listing.city, property_listing.country, year)
            
            suggestions = {
                "property_id": property_id,
                "year": year,
                "base_price": float(property_listing.base_price),
                "seasonal_recommendations": []
            }
            
            for period in seasonal_periods:
                seasonal_multiplier = self.pricing_config["seasonal_multipliers"][period["season_type"]]
                suggested_price = property_listing.base_price * Decimal(str(seasonal_multiplier))
                
                recommendation = {
                    "period": {
                        "start_date": period["start_date"].isoformat(),
                        "end_date": period["end_date"].isoformat(),
                        "season_name": period["season_name"]
                    },
                    "season_type": period["season_type"],
                    "suggested_price": float(suggested_price),
                    "multiplier": seasonal_multiplier,
                    "price_change": float(suggested_price - property_listing.base_price),
                    "reasoning": period["reasoning"]
                }
                
                suggestions["seasonal_recommendations"].append(recommendation)
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Error getting seasonal pricing suggestions: {str(e)}")
            raise
    
    # Helper Methods
    async def _verify_property_ownership(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str
    ) -> PropertyListing:
        """Verify property ownership"""
        query = select(PropertyListing).where(
            and_(
                PropertyListing.id == property_id,
                PropertyListing.host_id == host_id
            )
        )
        result = await session.execute(query)
        property_listing = result.scalar_one_or_none()
        
        if not property_listing:
            raise ValueError("Property not found or access denied")
        
        return property_listing
    
    async def _get_historical_performance(
        self,
        session: AsyncSession,
        property_id: str
    ) -> Dict[str, Any]:
        """Get historical performance data"""
        # Get analytics data for past 90 days
        start_date = datetime.utcnow() - timedelta(days=90)
        
        query = select(PropertyAnalytics).where(
            and_(
                PropertyAnalytics.property_id == property_id,
                PropertyAnalytics.date >= start_date.date()
            )
        ).order_by(PropertyAnalytics.date)
        
        result = await session.execute(query)
        analytics = result.scalars().all()
        
        # Aggregate data
        total_revenue = sum(a.revenue_earned for a in analytics)
        total_bookings = sum(a.confirmed_bookings for a in analytics)
        avg_occupancy = sum(a.occupancy_rate for a in analytics) / len(analytics) if analytics else 0
        avg_adr = sum(a.average_daily_rate for a in analytics) / len(analytics) if analytics else 0
        
        return {
            "total_revenue": float(total_revenue),
            "total_bookings": total_bookings,
            "average_occupancy_rate": avg_occupancy,
            "average_daily_rate": float(avg_adr),
            "data_points": len(analytics)
        }
    
    async def _analyze_market_conditions(
        self,
        session: AsyncSession,
        property_listing: PropertyListing
    ) -> Dict[str, Any]:
        """Analyze current market conditions"""
        # This would integrate with external market data APIs
        # For now, simulating market analysis
        
        return {
            "demand_level": DemandLevel.MEDIUM,
            "market_trends": "stable",
            "local_events": [],
            "seasonal_factor": 1.0,
            "economic_indicators": {
                "tourism_index": 85,
                "local_demand": 75,
                "competition_intensity": 65
            }
        }
    
    async def _get_competitor_analysis(
        self,
        session: AsyncSession,
        property_id: str
    ) -> List[PropertyCompetitorAnalysis]:
        """Get recent competitor analysis"""
        query = select(PropertyCompetitorAnalysis).where(
            and_(
                PropertyCompetitorAnalysis.property_id == property_id,
                PropertyCompetitorAnalysis.analysis_date >= datetime.utcnow() - timedelta(days=7)
            )
        )
        
        result = await session.execute(query)
        return result.scalars().all()
    
    async def _generate_date_recommendation(
        self,
        session: AsyncSession,
        property_listing: PropertyListing,
        target_date: date,
        historical_data: Dict[str, Any],
        market_data: Dict[str, Any],
        competitor_data: List[PropertyCompetitorAnalysis],
        optimization_goals: List[str]
    ) -> PricingRecommendation:
        """Generate pricing recommendation for specific date"""
        
        # Start with base price
        base_price = property_listing.base_price
        recommended_price = base_price
        
        # Apply demand-based adjustments
        demand_level = await self._calculate_demand_level(session, property_listing, target_date)
        demand_multiplier = self.pricing_config["demand_multipliers"][demand_level]
        recommended_price *= Decimal(str(demand_multiplier))
        
        # Apply seasonal adjustments
        season_type = self._determine_season_type(target_date, property_listing.city, property_listing.country)
        seasonal_multiplier = self.pricing_config["seasonal_multipliers"][season_type]
        recommended_price *= Decimal(str(seasonal_multiplier))
        
        # Apply weekday adjustments
        weekday = target_date.weekday()
        weekday_multiplier = self.pricing_config["weekday_multipliers"][weekday]
        recommended_price *= Decimal(str(weekday_multiplier))
        
        # Apply advance booking adjustments
        days_in_advance = (target_date - date.today()).days
        advance_multiplier = self._get_advance_booking_multiplier(days_in_advance)
        recommended_price *= Decimal(str(advance_multiplier))
        
        # Apply competitor-based adjustments
        if competitor_data:
            competitor_adjustment = self._calculate_competitor_adjustment(
                recommended_price, competitor_data
            )
            recommended_price *= Decimal(str(competitor_adjustment))
        
        # Ensure price is within reasonable bounds
        min_price = base_price * Decimal('0.5')  # 50% of base price
        max_price = base_price * Decimal('2.0')   # 200% of base price
        recommended_price = max(min_price, min(max_price, recommended_price))
        
        # Calculate expected impact
        current_price = await self._get_current_price(session, property_listing.id, target_date)
        price_change_percentage = float((recommended_price - current_price) / current_price * 100)
        
        # Estimate impact on occupancy and revenue
        occupancy_impact = self._estimate_occupancy_impact(price_change_percentage)
        revenue_impact = self._estimate_revenue_impact(price_change_percentage, occupancy_impact)
        
        # Generate reasoning
        reasoning = self._generate_pricing_reasoning(
            demand_level, season_type, weekday, days_in_advance, competitor_data
        )
        
        # Calculate confidence score
        confidence_score = self._calculate_confidence_score(
            historical_data, market_data, competitor_data
        )
        
        return PricingRecommendation(
            date=target_date,
            current_price=current_price,
            recommended_price=recommended_price,
            price_change_percentage=price_change_percentage,
            confidence_score=confidence_score,
            reasoning=reasoning,
            expected_impact={
                "occupancy_change": occupancy_impact,
                "revenue_change": revenue_impact
            }
        )
    
    async def _calculate_demand_level(
        self,
        session: AsyncSession,
        property_listing: PropertyListing,
        target_date: date
    ) -> DemandLevel:
        """Calculate demand level for specific date"""
        # This would use ML models and market data in production
        # For now, using simplified logic
        
        # Check day of week
        weekday = target_date.weekday()
        if weekday in [4, 5, 6]:  # Friday, Saturday, Sunday
            return DemandLevel.HIGH
        elif weekday in [0, 3]:   # Monday, Thursday
            return DemandLevel.MEDIUM
        else:
            return DemandLevel.LOW
    
    def _determine_season_type(
        self,
        target_date: date,
        city: str,
        country: str
    ) -> SeasonType:
        """Determine season type for location and date"""
        # Simplified seasonal logic (would be location-specific in production)
        month = target_date.month
        
        if month in [12, 1, 2]:  # Winter
            if country in ['Australia', 'New Zealand']:  # Southern hemisphere
                return SeasonType.HIGH
            else:
                return SeasonType.LOW
        elif month in [6, 7, 8]:  # Summer
            if country in ['Australia', 'New Zealand']:
                return SeasonType.LOW
            else:
                return SeasonType.HIGH
        elif month in [3, 4, 5, 9, 10, 11]:  # Spring/Fall
            return SeasonType.SHOULDER
        else:
            return SeasonType.MEDIUM
    
    def _get_advance_booking_multiplier(self, days_in_advance: int) -> float:
        """Get multiplier based on advance booking period"""
        multipliers = self.pricing_config["advance_booking_multipliers"]
        
        # Find closest matching period
        for days, multiplier in sorted(multipliers.items()):
            if days_in_advance <= days:
                return multiplier
        
        return multipliers[max(multipliers.keys())]
    
    def _calculate_competitor_adjustment(
        self,
        current_price: Decimal,
        competitor_data: List[PropertyCompetitorAnalysis]
    ) -> float:
        """Calculate adjustment based on competitor pricing"""
        if not competitor_data:
            return 1.0
        
        competitor_prices = [c.competitor_price for c in competitor_data if c.competitor_price]
        if not competitor_prices:
            return 1.0
        
        avg_competitor_price = sum(competitor_prices) / len(competitor_prices)
        
        # If we're significantly above competitors, suggest lower price
        if current_price > avg_competitor_price * Decimal('1.2'):
            return 0.95
        # If we're significantly below, suggest higher price
        elif current_price < avg_competitor_price * Decimal('0.8'):
            return 1.05
        else:
            return 1.0
    
    async def _get_current_price(
        self,
        session: AsyncSession,
        property_id: str,
        target_date: date
    ) -> Decimal:
        """Get current price for specific date"""
        query = select(PricingCalendar).where(
            and_(
                PricingCalendar.property_id == property_id,
                PricingCalendar.date == target_date
            )
        )
        result = await session.execute(query)
        pricing = result.scalar_one_or_none()
        
        if pricing:
            return pricing.final_price
        else:
            # Get base price from property
            query = select(PropertyListing.base_price).where(
                PropertyListing.id == property_id
            )
            result = await session.execute(query)
            return result.scalar() or Decimal('100')
    
    def _estimate_occupancy_impact(self, price_change_percentage: float) -> float:
        """Estimate impact on occupancy based on price change"""
        # Simplified elasticity model (would use ML in production)
        elasticity = -0.5  # Assumed price elasticity of demand
        return price_change_percentage * elasticity / 100
    
    def _estimate_revenue_impact(
        self,
        price_change_percentage: float,
        occupancy_impact: float
    ) -> float:
        """Estimate impact on revenue"""
        # Revenue = Price × Occupancy
        # Revenue change ≈ Price change + Occupancy change
        return price_change_percentage + occupancy_impact
    
    def _generate_pricing_reasoning(
        self,
        demand_level: DemandLevel,
        season_type: SeasonType,
        weekday: int,
        days_in_advance: int,
        competitor_data: List[PropertyCompetitorAnalysis]
    ) -> str:
        """Generate human-readable reasoning for pricing recommendation"""
        reasons = []
        
        # Demand level reasoning
        if demand_level == DemandLevel.HIGH:
            reasons.append("High demand period")
        elif demand_level == DemandLevel.LOW:
            reasons.append("Low demand period")
        
        # Seasonal reasoning
        if season_type == SeasonType.HIGH:
            reasons.append("Peak season")
        elif season_type == SeasonType.LOW:
            reasons.append("Off season")
        
        # Weekday reasoning
        weekday_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        if weekday in [4, 5, 6]:
            reasons.append(f"Weekend premium ({weekday_names[weekday]})")
        
        # Advance booking reasoning
        if days_in_advance <= 1:
            reasons.append("Last-minute booking discount")
        elif days_in_advance >= 90:
            reasons.append("Early booking premium")
        
        # Competitor reasoning
        if competitor_data:
            reasons.append("Adjusted for competitor pricing")
        
        return "; ".join(reasons) if reasons else "Standard pricing"
    
    def _calculate_confidence_score(
        self,
        historical_data: Dict[str, Any],
        market_data: Dict[str, Any],
        competitor_data: List[PropertyCompetitorAnalysis]
    ) -> float:
        """Calculate confidence score for recommendation"""
        score = 0.5  # Base confidence
        
        # More historical data increases confidence
        if historical_data["data_points"] > 30:
            score += 0.2
        elif historical_data["data_points"] > 10:
            score += 0.1
        
        # Market data availability
        if market_data.get("demand_level"):
            score += 0.15
        
        # Competitor data availability
        if competitor_data:
            score += 0.15
        
        return min(score, 1.0)
    
    async def _generate_optimization_summary(
        self,
        recommendations: List[PricingRecommendation],
        property_listing: PropertyListing,
        optimization_goals: List[str]
    ) -> Dict[str, Any]:
        """Generate optimization summary"""
        total_recommendations = len(recommendations)
        price_increases = sum(1 for r in recommendations if r.price_change_percentage > 0)
        price_decreases = sum(1 for r in recommendations if r.price_change_percentage < 0)
        
        avg_price_change = sum(r.price_change_percentage for r in recommendations) / total_recommendations
        total_revenue_impact = sum(r.expected_impact["revenue_change"] for r in recommendations)
        
        return {
            "total_days_analyzed": total_recommendations,
            "price_increases": price_increases,
            "price_decreases": price_decreases,
            "no_change": total_recommendations - price_increases - price_decreases,
            "average_price_change_percentage": avg_price_change,
            "estimated_total_revenue_impact": total_revenue_impact,
            "optimization_goals": optimization_goals,
            "confidence_score": sum(r.confidence_score for r in recommendations) / total_recommendations
        }
    
    async def _get_active_pricing_rules(
        self,
        session: AsyncSession,
        property_id: str
    ) -> List[PricingRule]:
        """Get active pricing rules for property"""
        query = select(PricingRule).where(
            and_(
                PricingRule.property_id == property_id,
                PricingRule.is_active == True
            )
        ).order_by(PricingRule.priority.desc())
        
        result = await session.execute(query)
        return result.scalars().all()
    
    async def _calculate_dynamic_price(
        self,
        session: AsyncSession,
        property_listing: PropertyListing,
        target_date: date,
        pricing_rules: List[PricingRule]
    ) -> Decimal:
        """Calculate dynamic price for specific date"""
        base_price = property_listing.base_price
        final_price = base_price
        
        # Apply pricing rules in priority order
        for rule in pricing_rules:
            if self._rule_applies_to_date(rule, target_date):
                adjustment = self._calculate_rule_adjustment(rule, final_price)
                final_price = adjustment
        
        return final_price
    
    def _rule_applies_to_date(self, rule: PricingRule, target_date: date) -> bool:
        """Check if pricing rule applies to specific date"""
        conditions = rule.conditions
        
        # Check date range conditions
        if "date_range" in conditions:
            start_date = datetime.strptime(conditions["date_range"]["start"], "%Y-%m-%d").date()
            end_date = datetime.strptime(conditions["date_range"]["end"], "%Y-%m-%d").date()
            if not (start_date <= target_date <= end_date):
                return False
        
        # Check weekday conditions
        if "weekdays" in conditions:
            if target_date.weekday() not in conditions["weekdays"]:
                return False
        
        # Check seasonal conditions
        if "seasons" in conditions:
            season = self._determine_season_type(target_date, "", "")
            if season.value not in conditions["seasons"]:
                return False
        
        return True
    
    def _calculate_rule_adjustment(self, rule: PricingRule, current_price: Decimal) -> Decimal:
        """Calculate price adjustment based on rule"""
        if rule.adjustment_type == "percentage":
            adjustment = current_price * (Decimal(str(rule.adjustment_value)) / 100)
            new_price = current_price + adjustment
        else:  # fixed_amount
            new_price = current_price + Decimal(str(rule.adjustment_value))
        
        # Apply min/max constraints
        if rule.minimum_price:
            new_price = max(new_price, rule.minimum_price)
        if rule.maximum_price:
            new_price = min(new_price, rule.maximum_price)
        
        return new_price
    
    async def _update_pricing_calendar_entry(
        self,
        session: AsyncSession,
        property_id: str,
        target_date: date,
        new_price: Decimal
    ):
        """Update pricing calendar entry"""
        query = select(PricingCalendar).where(
            and_(
                PricingCalendar.property_id == property_id,
                PricingCalendar.date == target_date
            )
        )
        result = await session.execute(query)
        pricing = result.scalar_one_or_none()
        
        if pricing:
            pricing.final_price = new_price
            pricing.updated_at = datetime.utcnow()
        else:
            # Create new pricing entry
            pricing = PricingCalendar(
                property_id=property_id,
                date=target_date,
                base_price=new_price,
                final_price=new_price
            )
            session.add(pricing)
    
    def _get_seasonal_periods(
        self,
        city: str,
        country: str,
        year: int
    ) -> List[Dict[str, Any]]:
        """Get seasonal periods for location (simplified)"""
        # This would be location-specific in production
        return [
            {
                "start_date": date(year, 12, 15),
                "end_date": date(year + 1, 1, 15),
                "season_name": "Winter Holiday Season",
                "season_type": SeasonType.PEAK,
                "reasoning": "High demand during holidays"
            },
            {
                "start_date": date(year, 6, 15),
                "end_date": date(year, 8, 31),
                "season_name": "Summer Season",
                "season_type": SeasonType.HIGH,
                "reasoning": "Peak travel season"
            },
            {
                "start_date": date(year, 3, 1),
                "end_date": date(year, 5, 31),
                "season_name": "Spring Season",
                "season_type": SeasonType.SHOULDER,
                "reasoning": "Moderate demand season"
            },
            {
                "start_date": date(year, 9, 1),
                "end_date": date(year, 11, 30),
                "season_name": "Fall Season",
                "season_type": SeasonType.SHOULDER,
                "reasoning": "Moderate demand season"
            }
        ]
    
    async def _perform_competitor_analysis(
        self,
        session: AsyncSession,
        property_listing: PropertyListing
    ) -> List[PropertyCompetitorAnalysis]:
        """Perform competitor analysis (simulated)"""
        # This would integrate with external APIs in production
        # For now, creating simulated competitor data
        
        competitors = []
        for i in range(5):  # Simulate 5 competitors
            competitor = PropertyCompetitorAnalysis(
                id=str(uuid.uuid4()),
                property_id=property_listing.id,
                competitor_property_id=f"comp_{i}",
                competitor_platform="airbnb",
                competitor_price=property_listing.base_price * Decimal(str(0.8 + (i * 0.1))),
                competitor_rating=4.0 + (i * 0.2),
                competitor_review_count=50 + (i * 20),
                distance_km=0.5 + (i * 0.3),
                price_difference=property_listing.base_price * Decimal(str(0.8 + (i * 0.1))) - property_listing.base_price,
                price_difference_percentage=float(((property_listing.base_price * Decimal(str(0.8 + (i * 0.1)))) - property_listing.base_price) / property_listing.base_price * 100),
                analysis_date=datetime.utcnow()
            )
            competitors.append(competitor)
            session.add(competitor)
        
        await session.commit()
        return competitors
    
    async def _get_historical_occupancy(
        self,
        session: AsyncSession,
        property_id: str,
        date_range: Tuple[date, date]
    ) -> Dict[str, float]:
        """Get historical occupancy data"""
        start_date, end_date = date_range
        
        query = select(PropertyAnalytics).where(
            and_(
                PropertyAnalytics.property_id == property_id,
                PropertyAnalytics.date >= start_date,
                PropertyAnalytics.date <= end_date
            )
        )
        
        result = await session.execute(query)
        analytics = result.scalars().all()
        
        if analytics:
            avg_occupancy = sum(a.occupancy_rate for a in analytics) / len(analytics)
            return {"average_occupancy": avg_occupancy}
        
        return {"average_occupancy": 0.7}  # Default assumption
    
    async def _analyze_pricing_scenario(
        self,
        session: AsyncSession,
        property_listing: PropertyListing,
        date_range: Tuple[date, date],
        scenario: Dict[str, Any],
        historical_occupancy: Dict[str, float]
    ) -> Dict[str, Any]:
        """Analyze specific pricing scenario"""
        start_date, end_date = date_range
        days = (end_date - start_date).days + 1
        
        # Calculate scenario metrics
        price_adjustment = scenario.get("price_adjustment", 0)  # Percentage
        new_price = property_listing.base_price * (1 + price_adjustment / 100)
        
        # Estimate occupancy impact
        base_occupancy = historical_occupancy["average_occupancy"]
        occupancy_elasticity = -0.5  # Simplified elasticity
        occupancy_change = price_adjustment * occupancy_elasticity / 100
        new_occupancy = max(0, min(1, base_occupancy + occupancy_change))
        
        # Calculate revenue
        projected_revenue = float(new_price * Decimal(str(new_occupancy)) * days)
        base_revenue = float(property_listing.base_price * Decimal(str(base_occupancy)) * days)
        revenue_change = projected_revenue - base_revenue
        
        return {
            "scenario_name": scenario["name"],
            "price_adjustment_percentage": price_adjustment,
            "new_price": float(new_price),
            "projected_occupancy": new_occupancy,
            "projected_revenue": projected_revenue,
            "revenue_change": revenue_change,
            "revenue_change_percentage": (revenue_change / base_revenue * 100) if base_revenue > 0 else 0
        }