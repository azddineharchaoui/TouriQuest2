"""
Repository pattern for POI data access
"""

from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text, desc, asc
from sqlalchemy.orm import selectinload, joinedload
from geoalchemy2.functions import ST_DWithin, ST_Distance, ST_GeogFromText
from app.models import (
    POI, POIReview, POIImage, AudioGuide, ARExperience, 
    OpeningHours, POIInteraction, CrowdLevel, NearbyAmenity,
    POITranslation, Amenity, AccessibilityFeature
)
from app.schemas import (
    POICreate, POIUpdate, SearchFilters, SearchRequest,
    RecommendationRequest, POIInteractionCreate
)


class POIRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_poi(self, poi_data: POICreate, created_by: UUID) -> POI:
        """Create a new POI"""
        # Create location point from coordinates
        location_wkt = f"POINT({poi_data.location.longitude} {poi_data.location.latitude})"
        
        # Generate slug from name
        slug = self._generate_slug(poi_data.name)
        
        db_poi = POI(
            name=poi_data.name,
            slug=slug,
            category=poi_data.category.value,
            subcategory=poi_data.subcategory,
            description=poi_data.description,
            short_description=poi_data.short_description,
            website=poi_data.website,
            phone=poi_data.phone,
            email=poi_data.email,
            address=poi_data.address,
            city=poi_data.city,
            country=poi_data.country,
            postal_code=poi_data.postal_code,
            location=location_wkt,
            is_family_friendly=poi_data.is_family_friendly,
            allows_photography=poi_data.allows_photography,
            is_free=poi_data.is_free,
            estimated_visit_duration=poi_data.estimated_visit_duration,
            created_by=created_by
        )
        
        # Set pricing information
        if poi_data.pricing:
            db_poi.entry_fee_adult = poi_data.pricing.adult
            db_poi.entry_fee_child = poi_data.pricing.child
            db_poi.entry_fee_senior = poi_data.pricing.senior
            db_poi.entry_fee_student = poi_data.pricing.student
            db_poi.currency = poi_data.pricing.currency
        
        self.db.add(db_poi)
        await self.db.flush()
        await self.db.refresh(db_poi)
        return db_poi

    async def get_poi_by_id(self, poi_id: UUID, include_relations: bool = True) -> Optional[POI]:
        """Get POI by ID with optional relationships"""
        query = select(POI).where(POI.id == poi_id, POI.is_active == True)
        
        if include_relations:
            query = query.options(
                selectinload(POI.opening_hours),
                selectinload(POI.images),
                selectinload(POI.audio_guides),
                selectinload(POI.ar_experiences),
                selectinload(POI.amenities),
                selectinload(POI.accessibility_features),
                selectinload(POI.nearby_amenities)
            )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_poi_by_slug(self, slug: str, include_relations: bool = True) -> Optional[POI]:
        """Get POI by slug"""
        query = select(POI).where(POI.slug == slug, POI.is_active == True)
        
        if include_relations:
            query = query.options(
                selectinload(POI.opening_hours),
                selectinload(POI.images),
                selectinload(POI.audio_guides),
                selectinload(POI.ar_experiences)
            )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def search_pois(self, search_request: SearchRequest) -> Tuple[List[POI], int]:
        """Advanced POI search with filters and sorting"""
        # Base query
        query = select(POI).where(POI.is_active == True)
        
        # Location-based filtering
        if search_request.location:
            location_wkt = f"POINT({search_request.location.longitude} {search_request.location.latitude})"
            radius_meters = search_request.radius_km * 1000
            
            query = query.where(
                ST_DWithin(
                    POI.location,
                    ST_GeogFromText(location_wkt),
                    radius_meters
                )
            )
        
        # Text search
        if search_request.query:
            search_terms = search_request.query.strip()
            query = query.where(
                or_(
                    POI.name.ilike(f"%{search_terms}%"),
                    POI.description.ilike(f"%{search_terms}%"),
                    POI.short_description.ilike(f"%{search_terms}%"),
                    POI.city.ilike(f"%{search_terms}%")
                )
            )
        
        # Apply filters
        if search_request.filters:
            query = self._apply_filters(query, search_request.filters)
        
        # Count total results
        count_query = select(func.count()).select_from(query.subquery())
        total_count = await self.db.scalar(count_query)
        
        # Apply sorting
        query = self._apply_sorting(query, search_request.sort_by, search_request.location)
        
        # Apply pagination
        query = query.offset(search_request.offset).limit(search_request.limit)
        
        # Execute query
        result = await self.db.execute(query)
        pois = result.scalars().all()
        
        return list(pois), total_count

    async def get_pois_by_category(self, category: str, limit: int = 20, offset: int = 0) -> List[POI]:
        """Get POIs by category"""
        query = select(POI).where(
            POI.category == category,
            POI.is_active == True
        ).order_by(desc(POI.popularity_score)).offset(offset).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_nearby_pois(self, latitude: float, longitude: float, radius_km: float = 10.0, limit: int = 20) -> List[POI]:
        """Get POIs near a location"""
        location_wkt = f"POINT({longitude} {latitude})"
        radius_meters = radius_km * 1000
        
        query = select(POI).where(
            POI.is_active == True,
            ST_DWithin(
                POI.location,
                ST_GeogFromText(location_wkt),
                radius_meters
            )
        ).order_by(
            ST_Distance(POI.location, ST_GeogFromText(location_wkt))
        ).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_trending_pois(self, limit: int = 20, hours: int = 24) -> List[POI]:
        """Get trending POIs based on recent interactions"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Subquery to calculate interaction scores
        interaction_subquery = select(
            POIInteraction.poi_id,
            func.count(POIInteraction.id).label('interaction_count')
        ).where(
            POIInteraction.created_at >= cutoff_time
        ).group_by(POIInteraction.poi_id).subquery()
        
        query = select(POI).join(
            interaction_subquery,
            POI.id == interaction_subquery.c.poi_id
        ).where(
            POI.is_active == True
        ).order_by(
            desc(interaction_subquery.c.interaction_count),
            desc(POI.popularity_score)
        ).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_recommended_pois(self, request: RecommendationRequest) -> List[POI]:
        """Get personalized POI recommendations"""
        query = select(POI).where(POI.is_active == True)
        
        # Filter by category preferences
        if request.category_preferences:
            categories = [cat.value for cat in request.category_preferences]
            query = query.where(POI.category.in_(categories))
        
        # Location-based if provided
        if request.location:
            location_wkt = f"POINT({request.location.longitude} {request.location.latitude})"
            query = query.order_by(
                ST_Distance(POI.location, ST_GeogFromText(location_wkt))
            )
        else:
            # Order by popularity if no location
            query = query.order_by(desc(POI.popularity_score))
        
        # Apply additional filters based on travel style and interests
        if request.budget_range == "budget":
            query = query.where(or_(POI.is_free == True, POI.entry_fee_adult <= 20))
        elif request.budget_range == "luxury":
            query = query.where(POI.entry_fee_adult >= 50)
        
        # Family-friendly filter
        if request.travel_style and "family" in request.travel_style:
            query = query.where(POI.is_family_friendly == True)
        
        query = query.limit(request.limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_poi(self, poi_id: UUID, poi_update: POIUpdate) -> Optional[POI]:
        """Update POI information"""
        poi = await self.get_poi_by_id(poi_id, include_relations=False)
        if not poi:
            return None
        
        update_data = poi_update.dict(exclude_unset=True)
        
        # Handle pricing update
        if 'pricing' in update_data and update_data['pricing']:
            pricing = update_data.pop('pricing')
            poi.entry_fee_adult = pricing.get('adult')
            poi.entry_fee_child = pricing.get('child')
            poi.entry_fee_senior = pricing.get('senior')
            poi.entry_fee_student = pricing.get('student')
            poi.currency = pricing.get('currency', 'USD')
        
        # Update other fields
        for field, value in update_data.items():
            setattr(poi, field, value)
        
        poi.last_updated = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(poi)
        return poi

    async def delete_poi(self, poi_id: UUID) -> bool:
        """Soft delete POI"""
        poi = await self.get_poi_by_id(poi_id, include_relations=False)
        if not poi:
            return False
        
        poi.is_active = False
        await self.db.flush()
        return True

    async def record_interaction(self, poi_id: UUID, interaction: POIInteractionCreate, user_id: Optional[UUID] = None, session_id: Optional[str] = None) -> bool:
        """Record user interaction with POI"""
        interaction_record = POIInteraction(
            poi_id=poi_id,
            user_id=user_id,
            session_id=session_id,
            interaction_type=interaction.interaction_type.value,
            interaction_data=interaction.interaction_data
        )
        
        self.db.add(interaction_record)
        
        # Update POI statistics
        poi = await self.get_poi_by_id(poi_id, include_relations=False)
        if poi:
            if interaction.interaction_type.value == "view":
                poi.view_count += 1
            
            # Recalculate popularity score
            await self._update_popularity_score(poi_id)
        
        await self.db.flush()
        return True

    async def add_to_favorites(self, user_id: UUID, poi_id: UUID) -> bool:
        """Add POI to user favorites"""
        # Check if already favorited
        existing = await self.db.execute(
            select(func.count()).select_from(user_poi_favorites).where(
                and_(
                    user_poi_favorites.c.user_id == user_id,
                    user_poi_favorites.c.poi_id == poi_id
                )
            )
        )
        
        if existing.scalar() > 0:
            return False  # Already favorited
        
        # Add to favorites
        await self.db.execute(
            user_poi_favorites.insert().values(
                user_id=user_id,
                poi_id=poi_id,
                created_at=datetime.utcnow()
            )
        )
        
        await self.db.flush()
        return True

    async def remove_from_favorites(self, user_id: UUID, poi_id: UUID) -> bool:
        """Remove POI from user favorites"""
        result = await self.db.execute(
            user_poi_favorites.delete().where(
                and_(
                    user_poi_favorites.c.user_id == user_id,
                    user_poi_favorites.c.poi_id == poi_id
                )
            )
        )
        
        await self.db.flush()
        return result.rowcount > 0

    async def get_user_favorites(self, user_id: UUID, limit: int = 50, offset: int = 0) -> List[POI]:
        """Get user's favorite POIs"""
        query = select(POI).join(
            user_poi_favorites,
            POI.id == user_poi_favorites.c.poi_id
        ).where(
            user_poi_favorites.c.user_id == user_id,
            POI.is_active == True
        ).order_by(desc(user_poi_favorites.c.created_at)).offset(offset).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    def _apply_filters(self, query, filters: SearchFilters):
        """Apply search filters to query"""
        if filters.category:
            categories = [cat.value for cat in filters.category]
            query = query.where(POI.category.in_(categories))
        
        if filters.is_free is not None:
            query = query.where(POI.is_free == filters.is_free)
        
        if filters.is_family_friendly is not None:
            query = query.where(POI.is_family_friendly == filters.is_family_friendly)
        
        if filters.allows_photography is not None:
            query = query.where(POI.allows_photography == filters.allows_photography)
        
        if filters.has_audio_guide is not None:
            query = query.where(POI.has_audio_guide == filters.has_audio_guide)
        
        if filters.has_ar_experience is not None:
            query = query.where(POI.has_ar_experience == filters.has_ar_experience)
        
        if filters.min_rating is not None:
            query = query.where(POI.average_rating >= filters.min_rating)
        
        if filters.max_price is not None:
            query = query.where(
                or_(
                    POI.is_free == True,
                    POI.entry_fee_adult <= filters.max_price
                )
            )
        
        if filters.max_visit_duration is not None:
            query = query.where(
                or_(
                    POI.estimated_visit_duration.is_(None),
                    POI.estimated_visit_duration <= filters.max_visit_duration
                )
            )
        
        return query

    def _apply_sorting(self, query, sort_by: str, location: Optional[Dict] = None):
        """Apply sorting to query"""
        if sort_by == "distance" and location:
            location_wkt = f"POINT({location.longitude} {location.latitude})"
            query = query.order_by(ST_Distance(POI.location, ST_GeogFromText(location_wkt)))
        elif sort_by == "rating":
            query = query.order_by(desc(POI.average_rating), desc(POI.review_count))
        elif sort_by == "popularity":
            query = query.order_by(desc(POI.popularity_score))
        elif sort_by == "price_low_high":
            query = query.order_by(asc(POI.entry_fee_adult))
        elif sort_by == "price_high_low":
            query = query.order_by(desc(POI.entry_fee_adult))
        elif sort_by == "newest":
            query = query.order_by(desc(POI.created_at))
        elif sort_by == "most_reviewed":
            query = query.order_by(desc(POI.review_count))
        else:  # relevance (default)
            query = query.order_by(desc(POI.popularity_score), desc(POI.average_rating))
        
        return query

    def _generate_slug(self, name: str) -> str:
        """Generate URL-friendly slug from POI name"""
        import re
        slug = re.sub(r'[^\w\s-]', '', name.lower())
        slug = re.sub(r'[\s_-]+', '-', slug)
        slug = slug.strip('-')
        
        # Add timestamp to ensure uniqueness
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        return f"{slug}-{timestamp}"

    async def _update_popularity_score(self, poi_id: UUID):
        """Update POI popularity score based on various factors"""
        # Get recent interactions (last 30 days)
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        interaction_count = await self.db.scalar(
            select(func.count(POIInteraction.id)).where(
                POIInteraction.poi_id == poi_id,
                POIInteraction.created_at >= cutoff_date
            )
        )
        
        poi = await self.get_poi_by_id(poi_id, include_relations=False)
        if poi:
            # Calculate popularity score (weighted combination)
            view_weight = 1.0
            rating_weight = 2.0
            review_weight = 1.5
            
            popularity_score = (
                (interaction_count * view_weight) +
                (poi.average_rating * poi.review_count * rating_weight) +
                (poi.review_count * review_weight)
            ) / 100  # Normalize
            
            poi.popularity_score = min(popularity_score, 10.0)  # Cap at 10
            await self.db.flush()


# Import user_poi_favorites table
from app.models import user_poi_favorites