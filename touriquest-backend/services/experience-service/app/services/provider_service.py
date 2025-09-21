"""
Provider management service for certification, verification, and quality assurance
"""

from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, date, timedelta
from decimal import Decimal
import asyncio
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, update
from sqlalchemy.orm import selectinload

from app.models import (
    Provider, ProviderCertification, ProviderEarning, Experience,
    ExperienceBooking, ExperienceReview, ProviderStatus
)
from app.schemas import (
    ProviderCreate, ProviderUpdate, Provider as ProviderSchema,
    ProviderCertification as CertificationSchema
)
from app.core.config import settings


@dataclass
class QualityMetrics:
    """Quality metrics for provider assessment"""
    response_rate: float = 0.0
    response_time_hours: float = 0.0
    cancellation_rate: float = 0.0
    no_show_rate: float = 0.0
    customer_satisfaction: float = 0.0
    safety_incidents: int = 0
    compliance_score: float = 0.0
    reliability_score: float = 0.0


class ProviderService:
    """Service for managing experience providers"""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_provider(self, provider_data: ProviderCreate, verification_documents: Optional[List[Dict[str, Any]]] = None) -> Provider:
        """Create a new provider with initial verification"""
        
        # Check if provider already exists for this user
        existing = await self.db.execute(
            select(Provider).where(Provider.user_id == provider_data.user_id)
        )
        if existing.scalar_one_or_none():
            raise ValueError("Provider already exists for this user")
        
        # Create provider
        provider = Provider(
            user_id=provider_data.user_id,
            business_name=provider_data.business_name,
            business_description=provider_data.business_description,
            business_type=provider_data.business_type,
            contact_person=provider_data.contact_person,
            phone=provider_data.phone,
            email=provider_data.email,
            website=str(provider_data.website) if provider_data.website else None,
            address=provider_data.address,
            city=provider_data.city,
            country=provider_data.country,
            postal_code=provider_data.postal_code,
            latitude=provider_data.latitude,
            longitude=provider_data.longitude,
            languages=provider_data.languages,
            verification_documents=verification_documents or [],
            status=ProviderStatus.PENDING
        )
        
        self.db.add(provider)
        await self.db.flush()
        
        # Calculate initial profile completion
        completion_percentage = await self._calculate_profile_completion(provider)
        provider.profile_completion_percentage = completion_percentage
        
        await self.db.commit()
        await self.db.refresh(provider)
        
        # Trigger verification process
        await self._initiate_verification_process(provider.id)
        
        return provider

    async def get_provider(self, provider_id: UUID, include_relations: bool = False) -> Optional[Provider]:
        """Get provider by ID"""
        query = select(Provider).where(Provider.id == provider_id)
        
        if include_relations:
            query = query.options(
                selectinload(Provider.experiences),
                selectinload(Provider.certifications),
                selectinload(Provider.earnings)
            )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_provider_by_user(self, user_id: UUID, include_relations: bool = False) -> Optional[Provider]:
        """Get provider by user ID"""
        query = select(Provider).where(Provider.user_id == user_id)
        
        if include_relations:
            query = query.options(
                selectinload(Provider.experiences),
                selectinload(Provider.certifications)
            )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update_provider(self, provider_id: UUID, provider_data: ProviderUpdate) -> Optional[Provider]:
        """Update provider information"""
        provider = await self.get_provider(provider_id)
        if not provider:
            return None
        
        # Update fields
        update_fields = provider_data.model_dump(exclude_unset=True)
        
        for field, value in update_fields.items():
            if hasattr(provider, field):
                setattr(provider, field, value)
        
        provider.updated_at = datetime.utcnow()
        
        # Recalculate profile completion
        completion_percentage = await self._calculate_profile_completion(provider)
        provider.profile_completion_percentage = completion_percentage
        
        await self.db.commit()
        await self.db.refresh(provider)
        
        return provider

    async def add_certification(self, provider_id: UUID, certification_data: CertificationSchema) -> ProviderCertification:
        """Add certification to provider"""
        certification = ProviderCertification(
            provider_id=provider_id,
            certification_name=certification_data.certification_name,
            certification_type=certification_data.certification_type,
            issuing_organization=certification_data.issuing_organization,
            certification_number=certification_data.certification_number,
            issue_date=certification_data.issue_date,
            expiry_date=certification_data.expiry_date,
            document_url=certification_data.document_url
        )
        
        self.db.add(certification)
        await self.db.commit()
        await self.db.refresh(certification)
        
        # Update provider profile completion
        provider = await self.get_provider(provider_id)
        if provider:
            completion_percentage = await self._calculate_profile_completion(provider)
            provider.profile_completion_percentage = completion_percentage
            await self.db.commit()
        
        return certification

    async def verify_certification(self, certification_id: UUID, is_verified: bool, notes: Optional[str] = None) -> bool:
        """Verify or reject a certification"""
        result = await self.db.execute(
            update(ProviderCertification)
            .where(ProviderCertification.id == certification_id)
            .values(
                is_verified=is_verified,
                verification_date=datetime.utcnow() if is_verified else None
            )
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            
            # Update provider verification status
            certification = await self.db.execute(
                select(ProviderCertification).where(ProviderCertification.id == certification_id)
            )
            cert = certification.scalar_one_or_none()
            
            if cert:
                await self._update_provider_verification_status(cert.provider_id)
            
            return True
        
        return False

    async def verify_insurance(self, provider_id: UUID, insurance_documents: List[Dict[str, Any]], is_verified: bool) -> bool:
        """Verify provider insurance"""
        provider = await self.get_provider(provider_id)
        if not provider:
            return False
        
        provider.insurance_verified = is_verified
        provider.insurance_documents = insurance_documents
        provider.updated_at = datetime.utcnow()
        
        await self.db.commit()
        
        # Update overall verification status
        await self._update_provider_verification_status(provider_id)
        
        return True

    async def update_provider_status(self, provider_id: UUID, status: ProviderStatus, reason: Optional[str] = None) -> bool:
        """Update provider status"""
        result = await self.db.execute(
            update(Provider)
            .where(Provider.id == provider_id)
            .values(
                status=status,
                updated_at=datetime.utcnow()
            )
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            
            # If activating provider, update quality scores
            if status == ProviderStatus.ACTIVE:
                await self._calculate_quality_scores(provider_id)
            
            return True
        
        return False

    async def calculate_quality_metrics(self, provider_id: UUID, days_back: int = 90) -> QualityMetrics:
        """Calculate comprehensive quality metrics for a provider"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Get provider's bookings in the period
        bookings_query = await self.db.execute(
            select(ExperienceBooking)
            .join(Experience)
            .where(
                and_(
                    Experience.provider_id == provider_id,
                    ExperienceBooking.created_at >= cutoff_date
                )
            )
        )
        bookings = bookings_query.scalars().all()
        
        if not bookings:
            return QualityMetrics()
        
        total_bookings = len(bookings)
        
        # Calculate response metrics
        responded_bookings = [b for b in bookings if b.provider_response is not None]
        response_rate = len(responded_bookings) / total_bookings if total_bookings > 0 else 0
        
        # Calculate average response time
        response_times = []
        for booking in responded_bookings:
            if booking.provider_response_deadline and booking.updated_at:
                response_time = (booking.updated_at - booking.created_at).total_seconds() / 3600
                response_times.append(response_time)
        
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        # Calculate cancellation and no-show rates
        cancelled_bookings = [b for b in bookings if b.status.value == "cancelled"]
        no_show_bookings = [b for b in bookings if b.no_show]
        
        cancellation_rate = len(cancelled_bookings) / total_bookings if total_bookings > 0 else 0
        no_show_rate = len(no_show_bookings) / total_bookings if total_bookings > 0 else 0
        
        # Get customer satisfaction from reviews
        reviews_query = await self.db.execute(
            select(ExperienceReview)
            .join(Experience)
            .where(
                and_(
                    Experience.provider_id == provider_id,
                    ExperienceReview.created_at >= cutoff_date
                )
            )
        )
        reviews = reviews_query.scalars().all()
        
        customer_satisfaction = 0.0
        if reviews:
            total_rating = sum(review.overall_rating for review in reviews)
            customer_satisfaction = total_rating / len(reviews)
        
        # Calculate compliance score (based on certifications, insurance, etc.)
        provider = await self.get_provider(provider_id, include_relations=True)
        compliance_score = await self._calculate_compliance_score(provider)
        
        # Calculate reliability score
        reliability_score = await self._calculate_reliability_score(provider_id, days_back)
        
        return QualityMetrics(
            response_rate=response_rate,
            response_time_hours=avg_response_time,
            cancellation_rate=cancellation_rate,
            no_show_rate=no_show_rate,
            customer_satisfaction=customer_satisfaction,
            safety_incidents=0,  # Would be tracked separately
            compliance_score=compliance_score,
            reliability_score=reliability_score
        )

    async def get_provider_analytics(self, provider_id: UUID, days_back: int = 30) -> Dict[str, Any]:
        """Get comprehensive analytics for a provider"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Revenue analytics
        earnings_query = await self.db.execute(
            select(
                func.count(ProviderEarning.id).label('total_transactions'),
                func.sum(ProviderEarning.gross_amount).label('gross_revenue'),
                func.sum(ProviderEarning.net_amount).label('net_revenue'),
                func.avg(ProviderEarning.gross_amount).label('avg_transaction_value')
            )
            .where(
                and_(
                    ProviderEarning.provider_id == provider_id,
                    ProviderEarning.earning_date >= cutoff_date.date()
                )
            )
        )
        earnings_data = earnings_query.first()
        
        # Booking analytics
        bookings_query = await self.db.execute(
            select(
                func.count(ExperienceBooking.id).label('total_bookings'),
                func.avg(ExperienceBooking.participants_count).label('avg_group_size'),
                func.count(ExperienceBooking.id).filter(
                    ExperienceBooking.status.in_(['confirmed', 'completed'])
                ).label('confirmed_bookings')
            )
            .join(Experience)
            .where(
                and_(
                    Experience.provider_id == provider_id,
                    ExperienceBooking.created_at >= cutoff_date
                )
            )
        )
        bookings_data = bookings_query.first()
        
        # Experience performance
        experiences_query = await self.db.execute(
            select(Experience)
            .where(Experience.provider_id == provider_id)
            .options(selectinload(Experience.reviews))
        )
        experiences = experiences_query.scalars().all()
        
        # Quality metrics
        quality_metrics = await self.calculate_quality_metrics(provider_id, days_back)
        
        return {
            'period': {
                'start_date': cutoff_date.date(),
                'end_date': datetime.utcnow().date(),
                'days': days_back
            },
            'revenue': {
                'total_transactions': earnings_data.total_transactions or 0,
                'gross_revenue': float(earnings_data.gross_revenue or 0),
                'net_revenue': float(earnings_data.net_revenue or 0),
                'avg_transaction_value': float(earnings_data.avg_transaction_value or 0)
            },
            'bookings': {
                'total_bookings': bookings_data.total_bookings or 0,
                'confirmed_bookings': bookings_data.confirmed_bookings or 0,
                'avg_group_size': float(bookings_data.avg_group_size or 0),
                'conversion_rate': (
                    (bookings_data.confirmed_bookings or 0) / (bookings_data.total_bookings or 1)
                )
            },
            'experiences': {
                'total_experiences': len(experiences),
                'active_experiences': len([e for e in experiences if e.is_active]),
                'avg_rating': sum(e.average_rating for e in experiences) / len(experiences) if experiences else 0
            },
            'quality_metrics': quality_metrics.__dict__
        }

    async def get_top_providers(self, category: Optional[str] = None, limit: int = 20) -> List[Provider]:
        """Get top-performing providers"""
        query = select(Provider).where(Provider.status == ProviderStatus.ACTIVE)
        
        if category:
            query = query.join(Experience).where(Experience.category == category)
        
        query = query.order_by(
            desc(Provider.quality_score),
            desc(Provider.average_rating),
            desc(Provider.total_bookings)
        ).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def search_providers(self, 
                             query: Optional[str] = None,
                             location: Optional[Tuple[float, float]] = None,
                             radius_km: Optional[float] = None,
                             category: Optional[str] = None,
                             min_rating: Optional[float] = None,
                             verified_only: bool = False,
                             limit: int = 20,
                             offset: int = 0) -> List[Provider]:
        """Search providers with filters"""
        
        db_query = select(Provider).where(Provider.status == ProviderStatus.ACTIVE)
        
        if query:
            db_query = db_query.where(
                or_(
                    Provider.business_name.ilike(f"%{query}%"),
                    Provider.business_description.ilike(f"%{query}%")
                )
            )
        
        if verified_only:
            db_query = db_query.where(Provider.is_verified == True)
        
        if min_rating:
            db_query = db_query.where(Provider.average_rating >= min_rating)
        
        if location and radius_km:
            lat, lng = location
            # Simplified distance calculation - in production use PostGIS
            db_query = db_query.where(
                and_(
                    Provider.latitude.between(lat - radius_km/111, lat + radius_km/111),
                    Provider.longitude.between(lng - radius_km/111, lng + radius_km/111)
                )
            )
        
        if category:
            db_query = db_query.join(Experience).where(Experience.category == category)
        
        db_query = db_query.order_by(
            desc(Provider.quality_score),
            desc(Provider.average_rating)
        ).offset(offset).limit(limit)
        
        result = await self.db.execute(db_query)
        return list(result.scalars().all())

    # Private helper methods
    async def _calculate_profile_completion(self, provider: Provider) -> float:
        """Calculate profile completion percentage"""
        completion_points = 0
        total_points = 100
        
        # Basic info (40 points)
        if provider.business_name: completion_points += 10
        if provider.business_description: completion_points += 10
        if provider.phone: completion_points += 5
        if provider.address: completion_points += 10
        if provider.latitude and provider.longitude: completion_points += 5
        
        # Verification (30 points)
        if provider.is_verified: completion_points += 15
        if provider.insurance_verified: completion_points += 15
        
        # Certifications (20 points)
        certifications = await self.db.execute(
            select(ProviderCertification)
            .where(ProviderCertification.provider_id == provider.id)
        )
        cert_count = len(certifications.scalars().all())
        completion_points += min(cert_count * 5, 20)
        
        # Experiences (10 points)
        experiences = await self.db.execute(
            select(Experience)
            .where(
                and_(
                    Experience.provider_id == provider.id,
                    Experience.is_published == True
                )
            )
        )
        exp_count = len(experiences.scalars().all())
        if exp_count > 0: completion_points += 10
        
        return min(completion_points / total_points * 100, 100.0)

    async def _initiate_verification_process(self, provider_id: UUID):
        """Initiate the verification process for a new provider"""
        # This would trigger background tasks for:
        # - Document verification
        # - Business license validation
        # - Insurance verification
        # - Background checks (if required)
        
        # For now, we'll just update the status
        await asyncio.sleep(0)  # Placeholder for async verification tasks

    async def _update_provider_verification_status(self, provider_id: UUID):
        """Update provider verification status based on completed verifications"""
        provider = await self.get_provider(provider_id, include_relations=True)
        if not provider:
            return
        
        # Check verification criteria
        has_verified_certifications = any(
            cert.is_verified for cert in provider.certifications
        )
        
        # Update verification status
        is_verified = (
            provider.insurance_verified and
            has_verified_certifications and
            provider.profile_completion_percentage >= 80
        )
        
        if is_verified and provider.status == ProviderStatus.PENDING:
            provider.status = ProviderStatus.ACTIVE
            provider.is_verified = True
        
        await self.db.commit()

    async def _calculate_compliance_score(self, provider: Provider) -> float:
        """Calculate compliance score based on certifications and documentation"""
        score = 0.0
        
        # Base score for verified provider
        if provider.is_verified:
            score += 30.0
        
        # Insurance verification
        if provider.insurance_verified:
            score += 25.0
        
        # Certifications
        verified_certs = [cert for cert in provider.certifications if cert.is_verified]
        cert_score = min(len(verified_certs) * 10, 30.0)
        score += cert_score
        
        # Profile completion
        score += (provider.profile_completion_percentage / 100) * 15.0
        
        return min(score, 100.0)

    async def _calculate_reliability_score(self, provider_id: UUID, days_back: int = 90) -> float:
        """Calculate reliability score based on booking history"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Get booking statistics
        bookings_query = await self.db.execute(
            select(ExperienceBooking)
            .join(Experience)
            .where(
                and_(
                    Experience.provider_id == provider_id,
                    ExperienceBooking.created_at >= cutoff_date
                )
            )
        )
        bookings = bookings_query.scalars().all()
        
        if not bookings:
            return 0.0
        
        total_bookings = len(bookings)
        completed_bookings = len([b for b in bookings if b.status.value == "completed"])
        cancelled_by_provider = len([
            b for b in bookings 
            if b.status.value == "cancelled" and "provider" in (b.cancellation_reason or "").lower()
        ])
        no_shows = len([b for b in bookings if b.no_show])
        
        # Calculate reliability metrics
        completion_rate = completed_bookings / total_bookings
        provider_cancellation_rate = cancelled_by_provider / total_bookings
        no_show_rate = no_shows / total_bookings
        
        # Calculate score (100 = perfect reliability)
        score = (
            completion_rate * 60 +  # 60% weight on completion
            (1 - provider_cancellation_rate) * 30 +  # 30% weight on not cancelling
            (1 - no_show_rate) * 10  # 10% weight on showing up
        ) * 100
        
        return min(score, 100.0)

    async def _calculate_quality_scores(self, provider_id: UUID):
        """Calculate and update all quality scores for a provider"""
        quality_metrics = await self.calculate_quality_metrics(provider_id)
        
        # Calculate overall quality score
        quality_score = (
            quality_metrics.customer_satisfaction / 5 * 40 +  # 40% customer satisfaction
            quality_metrics.response_rate * 25 +  # 25% response rate
            (1 - quality_metrics.cancellation_rate) * 15 +  # 15% cancellation rate
            quality_metrics.compliance_score / 100 * 20  # 20% compliance
        )
        
        # Update provider scores
        await self.db.execute(
            update(Provider)
            .where(Provider.id == provider_id)
            .values(
                quality_score=quality_score,
                reliability_score=quality_metrics.reliability_score,
                safety_score=quality_metrics.compliance_score,  # Using compliance as proxy
                response_rate=quality_metrics.response_rate,
                response_time_minutes=int(quality_metrics.response_time_hours * 60),
                updated_at=datetime.utcnow()
            )
        )
        
        await self.db.commit()