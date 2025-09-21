"""
Repository for content management (images, audio, AR, translations)
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text, desc, asc, update, delete
from sqlalchemy.orm import selectinload

from app.models import (
    POI, POIImage, AudioGuide, ARExperience, POITranslation,
    POIInteraction
)
from app.schemas import POIImageCreate, AudioGuideCreate, ARExperienceCreate


class ContentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # Image management
    async def create_poi_image(self, poi_id: UUID, image_data: POIImageCreate, uploaded_by: UUID) -> POIImage:
        """Create a new POI image"""
        # If this is set as primary, unset other primary images
        if image_data.is_primary:
            await self.db.execute(
                update(POIImage)
                .where(POIImage.poi_id == poi_id)
                .values(is_primary=False)
            )
        
        image = POIImage(
            poi_id=poi_id,
            url=image_data.url,
            thumbnail_url=image_data.thumbnail_url,
            alt_text=image_data.alt_text,
            caption=image_data.caption,
            order_index=image_data.order_index,
            is_primary=image_data.is_primary,
            uploaded_by=uploaded_by
        )
        
        self.db.add(image)
        await self.db.flush()
        await self.db.refresh(image)
        return image

    async def get_poi_images(self, poi_id: UUID, limit: int = 50, offset: int = 0) -> List[POIImage]:
        """Get images for a POI"""
        result = await self.db.execute(
            select(POIImage)
            .where(POIImage.poi_id == poi_id)
            .order_by(desc(POIImage.is_primary), asc(POIImage.order_index))
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_image_by_id(self, image_id: UUID) -> Optional[POIImage]:
        """Get image by ID"""
        result = await self.db.execute(
            select(POIImage).where(POIImage.id == image_id)
        )
        return result.scalar_one_or_none()

    async def update_poi_image(self, image_id: UUID, update_data: Dict[str, Any]) -> Optional[POIImage]:
        """Update POI image"""
        # If setting as primary, unset other primary images for the same POI
        if update_data.get('is_primary'):
            image = await self.get_image_by_id(image_id)
            if image:
                await self.db.execute(
                    update(POIImage)
                    .where(and_(POIImage.poi_id == image.poi_id, POIImage.id != image_id))
                    .values(is_primary=False)
                )
        
        result = await self.db.execute(
            update(POIImage)
            .where(POIImage.id == image_id)
            .values(**update_data)
            .returning(POIImage)
        )
        
        updated_image = result.scalar_one_or_none()
        if updated_image:
            await self.db.refresh(updated_image)
        
        return updated_image

    async def delete_poi_image(self, image_id: UUID) -> bool:
        """Delete POI image"""
        result = await self.db.execute(
            delete(POIImage).where(POIImage.id == image_id)
        )
        await self.db.flush()
        return result.rowcount > 0

    # Audio guide management
    async def create_audio_guide(self, poi_id: UUID, audio_data: AudioGuideCreate, created_by: UUID) -> AudioGuide:
        """Create a new audio guide"""
        audio_guide = AudioGuide(
            poi_id=poi_id,
            language_code=audio_data.language_code,
            title=audio_data.title,
            description=audio_data.description,
            audio_url=audio_data.audio_url,
            transcript=audio_data.transcript,
            duration_seconds=audio_data.duration_seconds,
            narrator_name=audio_data.narrator_name,
            narrator_bio=audio_data.narrator_bio
        )
        
        self.db.add(audio_guide)
        await self.db.flush()
        await self.db.refresh(audio_guide)
        
        # Update POI to indicate it has audio guides
        await self.db.execute(
            update(POI)
            .where(POI.id == poi_id)
            .values(has_audio_guide=True)
        )
        
        return audio_guide

    async def get_poi_audio_guides(self, poi_id: UUID, language_code: Optional[str] = None) -> List[AudioGuide]:
        """Get audio guides for a POI"""
        query = select(AudioGuide).where(
            and_(
                AudioGuide.poi_id == poi_id,
                AudioGuide.is_active == True
            )
        )
        
        if language_code:
            query = query.where(AudioGuide.language_code == language_code)
        
        query = query.order_by(AudioGuide.language_code, AudioGuide.created_at)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def record_audio_play(self, guide_id: UUID, user_id: Optional[UUID], session_id: Optional[str]) -> bool:
        """Record audio guide play event"""
        # Update play count
        result = await self.db.execute(
            update(AudioGuide)
            .where(AudioGuide.id == guide_id)
            .values(play_count=AudioGuide.play_count + 1)
        )
        
        if result.rowcount == 0:
            return False
        
        # Get POI ID for interaction tracking
        audio_guide = await self.db.execute(
            select(AudioGuide.poi_id).where(AudioGuide.id == guide_id)
        )
        poi_id = audio_guide.scalar_one_or_none()
        
        if poi_id:
            # Record interaction
            interaction = POIInteraction(
                poi_id=poi_id,
                user_id=user_id,
                session_id=session_id,
                interaction_type="audio_play",
                interaction_data={"audio_guide_id": str(guide_id)}
            )
            self.db.add(interaction)
        
        await self.db.flush()
        return True

    # AR Experience management
    async def create_ar_experience(self, poi_id: UUID, ar_data: ARExperienceCreate, created_by: UUID) -> ARExperience:
        """Create a new AR experience"""
        # Convert trigger location if provided
        trigger_location_wkt = None
        if ar_data.trigger_location:
            trigger_location_wkt = f"POINT({ar_data.trigger_location.longitude} {ar_data.trigger_location.latitude})"
        
        ar_experience = ARExperience(
            poi_id=poi_id,
            name=ar_data.name,
            description=ar_data.description,
            instructions=ar_data.instructions,
            model_url=ar_data.model_url,
            texture_url=ar_data.texture_url,
            animation_url=ar_data.animation_url,
            trigger_location=trigger_location_wkt,
            trigger_radius_meters=ar_data.trigger_radius_meters,
            min_ios_version=ar_data.min_ios_version,
            min_android_version=ar_data.min_android_version,
            requires_lidar=ar_data.requires_lidar,
            estimated_experience_duration=ar_data.estimated_experience_duration
        )
        
        self.db.add(ar_experience)
        await self.db.flush()
        await self.db.refresh(ar_experience)
        
        # Update POI to indicate it has AR experiences
        await self.db.execute(
            update(POI)
            .where(POI.id == poi_id)
            .values(has_ar_experience=True)
        )
        
        return ar_experience

    async def get_poi_ar_experiences(self, poi_id: UUID) -> List[ARExperience]:
        """Get AR experiences for a POI"""
        result = await self.db.execute(
            select(ARExperience)
            .where(
                and_(
                    ARExperience.poi_id == poi_id,
                    ARExperience.is_active == True
                )
            )
            .order_by(ARExperience.created_at)
        )
        return list(result.scalars().all())

    async def record_ar_usage(self, experience_id: UUID, user_id: Optional[UUID], session_id: Optional[str], duration_seconds: Optional[int]) -> bool:
        """Record AR experience usage"""
        # Update usage count
        result = await self.db.execute(
            update(ARExperience)
            .where(ARExperience.id == experience_id)
            .values(usage_count=ARExperience.usage_count + 1)
        )
        
        if result.rowcount == 0:
            return False
        
        # Get POI ID for interaction tracking
        ar_experience = await self.db.execute(
            select(ARExperience.poi_id).where(ARExperience.id == experience_id)
        )
        poi_id = ar_experience.scalar_one_or_none()
        
        if poi_id:
            # Record interaction
            interaction_data = {"ar_experience_id": str(experience_id)}
            if duration_seconds:
                interaction_data["duration_seconds"] = duration_seconds
            
            interaction = POIInteraction(
                poi_id=poi_id,
                user_id=user_id,
                session_id=session_id,
                interaction_type="ar_experience",
                interaction_data=interaction_data
            )
            self.db.add(interaction)
        
        await self.db.flush()
        return True

    # Translation management
    async def create_or_update_translation(self, poi_id: UUID, translation_data: Dict[str, Any]) -> Optional[POITranslation]:
        """Create or update POI translation"""
        language_code = translation_data['language_code']
        
        # Check if translation exists
        existing = await self.db.execute(
            select(POITranslation).where(
                and_(
                    POITranslation.poi_id == poi_id,
                    POITranslation.language_code == language_code
                )
            )
        )
        
        translation = existing.scalar_one_or_none()
        
        if translation:
            # Update existing
            update_fields = {k: v for k, v in translation_data.items() if k != 'language_code'}
            update_fields['updated_at'] = datetime.utcnow()
            
            await self.db.execute(
                update(POITranslation)
                .where(POITranslation.id == translation.id)
                .values(**update_fields)
            )
            await self.db.refresh(translation)
        else:
            # Create new
            translation = POITranslation(
                poi_id=poi_id,
                **translation_data
            )
            self.db.add(translation)
            await self.db.flush()
            await self.db.refresh(translation)
        
        return translation

    async def get_poi_translations(self, poi_id: UUID, language_code: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get translations for a POI"""
        query = select(POITranslation).where(POITranslation.poi_id == poi_id)
        
        if language_code:
            query = query.where(POITranslation.language_code == language_code)
        
        result = await self.db.execute(query)
        translations = result.scalars().all()
        
        return [
            {
                "id": t.id,
                "language_code": t.language_code,
                "name": t.name,
                "description": t.description,
                "short_description": t.short_description,
                "visitor_tips": t.visitor_tips,
                "historical_info": t.historical_info,
                "created_at": t.created_at,
                "updated_at": t.updated_at
            }
            for t in translations
        ]

    async def get_localized_content(self, poi_id: UUID, language_code: str, fallback_language: str = "en") -> Optional[Dict[str, Any]]:
        """Get localized content with fallback"""
        # Try preferred language first
        preferred = await self.db.execute(
            select(POITranslation).where(
                and_(
                    POITranslation.poi_id == poi_id,
                    POITranslation.language_code == language_code
                )
            )
        )
        
        translation = preferred.scalar_one_or_none()
        
        # Fallback to fallback language if preferred not found
        if not translation and language_code != fallback_language:
            fallback = await self.db.execute(
                select(POITranslation).where(
                    and_(
                        POITranslation.poi_id == poi_id,
                        POITranslation.language_code == fallback_language
                    )
                )
            )
            translation = fallback.scalar_one_or_none()
        
        # Get base POI data
        poi = await self.db.execute(
            select(POI).where(POI.id == poi_id)
        )
        base_poi = poi.scalar_one_or_none()
        
        if not base_poi:
            return None
        
        # Combine base POI data with translation
        content = {
            "id": base_poi.id,
            "name": translation.name if translation and translation.name else base_poi.name,
            "description": translation.description if translation and translation.description else base_poi.description,
            "short_description": translation.short_description if translation and translation.short_description else base_poi.short_description,
            "visitor_tips": translation.visitor_tips if translation else None,
            "historical_info": translation.historical_info if translation else None,
            "language_code": translation.language_code if translation else "default",
            "category": base_poi.category,
            "website": base_poi.website,
            "phone": base_poi.phone,
            "email": base_poi.email
        }
        
        return content

    # Content moderation
    async def moderate_content(self, content_type: str, content_id: UUID, action: str, moderator_id: UUID, notes: Optional[str]) -> bool:
        """Moderate content (approve, reject, flag)"""
        # This is a simplified implementation
        # In production, you'd have a more sophisticated moderation system
        
        moderation_data = {
            "moderated_by": moderator_id,
            "moderation_notes": notes,
            "updated_at": datetime.utcnow()
        }
        
        if content_type == "image":
            # For images, you might have a status field
            # For now, just record the moderation
            pass
        elif content_type == "audio":
            if action == "approve":
                moderation_data["is_active"] = True
            elif action == "reject":
                moderation_data["is_active"] = False
            
            result = await self.db.execute(
                update(AudioGuide)
                .where(AudioGuide.id == content_id)
                .values(**moderation_data)
            )
            return result.rowcount > 0
        
        elif content_type == "ar":
            if action == "approve":
                moderation_data["is_active"] = True
            elif action == "reject":
                moderation_data["is_active"] = False
            
            result = await self.db.execute(
                update(ARExperience)
                .where(ARExperience.id == content_id)
                .values(**moderation_data)
            )
            return result.rowcount > 0
        
        return True

    async def get_pending_moderation_content(self, content_type: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get content pending moderation"""
        # This would return content that needs moderation
        # For now, return recent content as example
        
        results = []
        
        if not content_type or content_type == "audio":
            audio_guides = await self.db.execute(
                select(AudioGuide)
                .order_by(desc(AudioGuide.created_at))
                .offset(offset)
                .limit(limit)
            )
            
            for guide in audio_guides.scalars():
                results.append({
                    "type": "audio",
                    "id": guide.id,
                    "poi_id": guide.poi_id,
                    "title": guide.title,
                    "created_at": guide.created_at,
                    "status": "pending"
                })
        
        return results

    async def get_content_analytics(self, poi_id: UUID) -> Dict[str, Any]:
        """Get content analytics for a POI"""
        # Image analytics
        image_count = await self.db.scalar(
            select(func.count(POIImage.id)).where(POIImage.poi_id == poi_id)
        )
        
        # Audio guide analytics
        audio_stats = await self.db.execute(
            select(
                func.count(AudioGuide.id).label('count'),
                func.sum(AudioGuide.play_count).label('total_plays'),
                func.sum(AudioGuide.download_count).label('total_downloads')
            ).where(AudioGuide.poi_id == poi_id)
        )
        audio_data = audio_stats.first()
        
        # AR experience analytics
        ar_stats = await self.db.execute(
            select(
                func.count(ARExperience.id).label('count'),
                func.sum(ARExperience.usage_count).label('total_uses')
            ).where(ARExperience.poi_id == poi_id)
        )
        ar_data = ar_stats.first()
        
        # Translation analytics
        translation_count = await self.db.scalar(
            select(func.count(POITranslation.id)).where(POITranslation.poi_id == poi_id)
        )
        
        return {
            "images": {
                "count": image_count or 0
            },
            "audio_guides": {
                "count": audio_data.count or 0,
                "total_plays": audio_data.total_plays or 0,
                "total_downloads": audio_data.total_downloads or 0
            },
            "ar_experiences": {
                "count": ar_data.count or 0,
                "total_uses": ar_data.total_uses or 0
            },
            "translations": {
                "count": translation_count or 0
            }
        }