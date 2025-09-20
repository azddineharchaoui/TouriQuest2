"""
Content Management Service
High-level content operations, multi-language support, duplicate detection
"""
import hashlib
import uuid
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import difflib
import re

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer

from ..models import (
    MediaFile, ContentTag, MediaTagAssociation, ContentLanguage,
    ContentModerationRecord, DMCACompliance, MediaType, ModerationStatus,
    ProcessingStatus, PrivacyLevel
)
from ..schemas.media_schemas import (
    ContentSearchRequest, ContentSearchResponse,
    DuplicateDetectionRequest, DuplicateDetectionResponse,
    ContentModerationWorkflowRequest, ContentModerationWorkflowResponse,
    MultiLanguageContentRequest, MultiLanguageContentResponse,
    ContentTaggingRequest, ContentTaggingResponse
)


class ContentService:
    """Advanced content management and organization service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.stemmer = PorterStemmer()
        
        # Download NLTK data if not already present
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt')
        
        try:
            nltk.data.find('corpora/stopwords')
        except LookupError:
            nltk.download('stopwords')
    
    async def detect_duplicate_content(
        self, 
        request: DuplicateDetectionRequest,
        user_id: uuid.UUID
    ) -> DuplicateDetectionResponse:
        """Detect duplicate or similar content"""
        
        duplicates = []
        similar_content = []
        
        # Get the source file
        source_file = self.db.query(MediaFile).filter(
            and_(
                MediaFile.id == request.source_file_id,
                MediaFile.uploaded_by_user_id == user_id
            )
        ).first()
        
        if not source_file:
            raise ValueError("Source file not found")
        
        # Find exact duplicates by hash
        if request.check_exact_duplicates:
            exact_duplicates = self._find_exact_duplicates(source_file, user_id)
            duplicates.extend(exact_duplicates)
        
        # Find similar content by metadata and content analysis
        if request.check_similar_content:
            similar_files = self._find_similar_content(source_file, user_id, request.similarity_threshold)
            similar_content.extend(similar_files)
        
        # Find duplicates by filename patterns
        if request.check_filename_similarity:
            filename_matches = self._find_filename_duplicates(source_file, user_id)
            similar_content.extend(filename_matches)
        
        return DuplicateDetectionResponse(
            source_file_id=request.source_file_id,
            exact_duplicates=duplicates,
            similar_content=similar_content,
            total_duplicates=len(duplicates),
            total_similar=len(similar_content),
            detection_completed_at=datetime.utcnow()
        )
    
    def _find_exact_duplicates(self, source_file: MediaFile, user_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Find files with identical content hash"""
        
        if not source_file.content_hash:
            return []
        
        # Find files with same hash but different ID
        duplicates = self.db.query(MediaFile).filter(
            and_(
                MediaFile.content_hash == source_file.content_hash,
                MediaFile.id != source_file.id,
                or_(
                    MediaFile.uploaded_by_user_id == user_id,
                    MediaFile.privacy_level == PrivacyLevel.PUBLIC
                )
            )
        ).all()
        
        return [
            {
                "file_id": str(duplicate.id),
                "filename": duplicate.filename,
                "title": duplicate.title,
                "uploaded_at": duplicate.uploaded_at,
                "file_size": duplicate.file_size,
                "similarity_score": 1.0,  # Exact match
                "match_type": "exact_hash"
            }
            for duplicate in duplicates
        ]
    
    def _find_similar_content(
        self, 
        source_file: MediaFile, 
        user_id: uuid.UUID, 
        threshold: float = 0.8
    ) -> List[Dict[str, Any]]:
        """Find similar content based on metadata and content analysis"""
        
        similar_files = []
        
        # Get candidates based on media type and size similarity
        size_tolerance = 0.1  # 10% size difference tolerance
        min_size = source_file.file_size * (1 - size_tolerance)
        max_size = source_file.file_size * (1 + size_tolerance)
        
        candidates = self.db.query(MediaFile).filter(
            and_(
                MediaFile.media_type == source_file.media_type,
                MediaFile.id != source_file.id,
                MediaFile.file_size.between(min_size, max_size),
                or_(
                    MediaFile.uploaded_by_user_id == user_id,
                    MediaFile.privacy_level == PrivacyLevel.PUBLIC
                )
            )
        ).all()
        
        for candidate in candidates:
            similarity_score = self._calculate_content_similarity(source_file, candidate)
            
            if similarity_score >= threshold:
                similar_files.append({
                    "file_id": str(candidate.id),
                    "filename": candidate.filename,
                    "title": candidate.title,
                    "uploaded_at": candidate.uploaded_at,
                    "file_size": candidate.file_size,
                    "similarity_score": similarity_score,
                    "match_type": "content_similarity"
                })
        
        # Sort by similarity score
        similar_files.sort(key=lambda x: x["similarity_score"], reverse=True)
        
        return similar_files
    
    def _find_filename_duplicates(self, source_file: MediaFile, user_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Find files with similar filenames"""
        
        filename_matches = []
        
        # Get all files from user
        user_files = self.db.query(MediaFile).filter(
            and_(
                MediaFile.uploaded_by_user_id == user_id,
                MediaFile.id != source_file.id
            )
        ).all()
        
        source_filename_clean = self._clean_filename(source_file.filename)
        
        for file in user_files:
            candidate_filename_clean = self._clean_filename(file.filename)
            
            # Calculate string similarity
            similarity = difflib.SequenceMatcher(
                None, 
                source_filename_clean, 
                candidate_filename_clean
            ).ratio()
            
            if similarity >= 0.8:  # 80% filename similarity
                filename_matches.append({
                    "file_id": str(file.id),
                    "filename": file.filename,
                    "title": file.title,
                    "uploaded_at": file.uploaded_at,
                    "file_size": file.file_size,
                    "similarity_score": similarity,
                    "match_type": "filename_similarity"
                })
        
        return filename_matches
    
    def _clean_filename(self, filename: str) -> str:
        """Clean filename for comparison"""
        
        # Remove extension
        name_without_ext = filename.rsplit('.', 1)[0] if '.' in filename else filename
        
        # Remove common patterns like timestamps, copy numbers, etc.
        patterns_to_remove = [
            r'_\d+$',  # _123
            r'\s+\(\d+\)$',  # (1), (2), etc.
            r'_copy$',
            r'_duplicate$',
            r'_\d{4}-\d{2}-\d{2}',  # _2023-01-01
            r'_\d{8}',  # _20230101
        ]
        
        for pattern in patterns_to_remove:
            name_without_ext = re.sub(pattern, '', name_without_ext, flags=re.IGNORECASE)
        
        # Normalize spaces and case
        return re.sub(r'\s+', ' ', name_without_ext.lower().strip())
    
    def _calculate_content_similarity(self, file1: MediaFile, file2: MediaFile) -> float:
        """Calculate similarity between two media files"""
        
        similarity_factors = []
        
        # Title similarity
        if file1.title and file2.title:
            title_similarity = difflib.SequenceMatcher(
                None, 
                file1.title.lower(), 
                file2.title.lower()
            ).ratio()
            similarity_factors.append(('title', title_similarity, 0.3))
        
        # Description similarity
        if file1.description and file2.description:
            desc_similarity = self._calculate_text_similarity(
                file1.description, 
                file2.description
            )
            similarity_factors.append(('description', desc_similarity, 0.3))
        
        # Metadata similarity (for images: dimensions, for videos: duration, etc.)
        if file1.metadata and file2.metadata:
            metadata_similarity = self._calculate_metadata_similarity(
                file1.metadata, 
                file2.metadata
            )
            similarity_factors.append(('metadata', metadata_similarity, 0.2))
        
        # Tag similarity
        tags1 = self._get_file_tags(file1.id)
        tags2 = self._get_file_tags(file2.id)
        if tags1 and tags2:
            tag_similarity = self._calculate_tag_similarity(tags1, tags2)
            similarity_factors.append(('tags', tag_similarity, 0.2))
        
        # Calculate weighted average
        if not similarity_factors:
            return 0.0
        
        total_weight = sum(weight for _, _, weight in similarity_factors)
        weighted_sum = sum(score * weight for _, score, weight in similarity_factors)
        
        return weighted_sum / total_weight if total_weight > 0 else 0.0
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calculate semantic similarity between texts"""
        
        # Tokenize and clean
        tokens1 = self._process_text(text1)
        tokens2 = self._process_text(text2)
        
        if not tokens1 or not tokens2:
            return 0.0
        
        # Calculate Jaccard similarity
        set1 = set(tokens1)
        set2 = set(tokens2)
        
        intersection = len(set1.intersection(set2))
        union = len(set1.union(set2))
        
        return intersection / union if union > 0 else 0.0
    
    def _process_text(self, text: str) -> List[str]:
        """Process text for similarity analysis"""
        
        # Convert to lowercase and tokenize
        tokens = word_tokenize(text.lower())
        
        # Remove punctuation and stopwords
        stop_words = set(stopwords.words('english'))
        
        processed_tokens = []
        for token in tokens:
            if (token.isalnum() and 
                token not in stop_words and 
                len(token) > 2):
                # Stem the word
                stemmed = self.stemmer.stem(token)
                processed_tokens.append(stemmed)
        
        return processed_tokens
    
    def _calculate_metadata_similarity(self, metadata1: Dict, metadata2: Dict) -> float:
        """Calculate similarity between metadata objects"""
        
        similarity_scores = []
        
        # Common metadata fields to compare
        fields_to_compare = [
            'width', 'height', 'duration', 'format', 'color_profile',
            'camera_make', 'camera_model', 'creation_date'
        ]
        
        for field in fields_to_compare:
            if field in metadata1 and field in metadata2:
                value1 = metadata1[field]
                value2 = metadata2[field]
                
                if isinstance(value1, (int, float)) and isinstance(value2, (int, float)):
                    # Numerical similarity
                    max_val = max(abs(value1), abs(value2))
                    if max_val > 0:
                        similarity = 1 - abs(value1 - value2) / max_val
                        similarity_scores.append(max(0, similarity))
                elif isinstance(value1, str) and isinstance(value2, str):
                    # String similarity
                    similarity = difflib.SequenceMatcher(None, value1, value2).ratio()
                    similarity_scores.append(similarity)
        
        return sum(similarity_scores) / len(similarity_scores) if similarity_scores else 0.0
    
    def _calculate_tag_similarity(self, tags1: List[str], tags2: List[str]) -> float:
        """Calculate similarity between tag lists"""
        
        set1 = set(tag.lower() for tag in tags1)
        set2 = set(tag.lower() for tag in tags2)
        
        intersection = len(set1.intersection(set2))
        union = len(set1.union(set2))
        
        return intersection / union if union > 0 else 0.0
    
    def _get_file_tags(self, file_id: uuid.UUID) -> List[str]:
        """Get tags for a file"""
        
        tags = self.db.query(ContentTag).join(
            MediaTagAssociation,
            ContentTag.id == MediaTagAssociation.tag_id
        ).filter(
            MediaTagAssociation.media_file_id == file_id
        ).all()
        
        return [tag.name for tag in tags]
    
    async def auto_tag_content(
        self, 
        request: ContentTaggingRequest,
        user_id: uuid.UUID
    ) -> ContentTaggingResponse:
        """Automatically generate tags for content"""
        
        media_file = self.db.query(MediaFile).filter(
            and_(
                MediaFile.id == request.media_file_id,
                MediaFile.uploaded_by_user_id == user_id
            )
        ).first()
        
        if not media_file:
            raise ValueError("Media file not found")
        
        generated_tags = []
        
        # Extract tags from filename
        filename_tags = self._extract_filename_tags(media_file.filename)
        generated_tags.extend(filename_tags)
        
        # Extract tags from title and description
        if media_file.title:
            title_tags = self._extract_text_tags(media_file.title)
            generated_tags.extend(title_tags)
        
        if media_file.description:
            desc_tags = self._extract_text_tags(media_file.description)
            generated_tags.extend(desc_tags)
        
        # Extract tags from metadata
        if media_file.metadata:
            metadata_tags = self._extract_metadata_tags(media_file.metadata, media_file.media_type)
            generated_tags.extend(metadata_tags)
        
        # Remove duplicates and filter
        unique_tags = list(set(generated_tags))
        filtered_tags = [tag for tag in unique_tags if len(tag) > 2 and len(tag) < 50]
        
        # Apply tags if requested
        applied_tags = []
        if request.apply_tags:
            applied_tags = await self._apply_tags_to_file(
                media_file.id, 
                filtered_tags, 
                confidence_threshold=request.confidence_threshold
            )
        
        return ContentTaggingResponse(
            media_file_id=request.media_file_id,
            suggested_tags=filtered_tags,
            applied_tags=applied_tags,
            confidence_scores={tag: 0.8 for tag in filtered_tags},  # Default confidence
            tagging_completed_at=datetime.utcnow()
        )
    
    def _extract_filename_tags(self, filename: str) -> List[str]:
        """Extract meaningful tags from filename"""
        
        # Remove extension and common suffixes
        name = filename.rsplit('.', 1)[0]
        name = re.sub(r'_\d+$', '', name)  # Remove trailing numbers
        
        # Split by common separators
        parts = re.split(r'[_\-\s\.]+', name)
        
        # Filter meaningful parts
        tags = []
        for part in parts:
            part = part.strip().lower()
            if (len(part) > 2 and 
                part.isalpha() and 
                not part.isdigit()):
                tags.append(part)
        
        return tags
    
    def _extract_text_tags(self, text: str) -> List[str]:
        """Extract tags from title or description text"""
        
        # Process text
        tokens = self._process_text(text)
        
        # Filter for potential tags (nouns, adjectives)
        # This is a simplified approach - could be enhanced with NLP
        potential_tags = []
        for token in tokens:
            if len(token) > 3:  # Longer words are more likely to be meaningful tags
                potential_tags.append(token)
        
        return potential_tags
    
    def _extract_metadata_tags(self, metadata: Dict, media_type: MediaType) -> List[str]:
        """Extract tags from metadata based on media type"""
        
        tags = []
        
        if media_type == MediaType.IMAGE:
            # Camera and technical tags
            if 'camera_make' in metadata:
                tags.append(f"camera_{metadata['camera_make'].lower()}")
            if 'camera_model' in metadata:
                tags.append(f"model_{metadata['camera_model'].lower().replace(' ', '_')}")
            
            # Orientation and size tags
            if 'width' in metadata and 'height' in metadata:
                width, height = metadata['width'], metadata['height']
                if width > height:
                    tags.append('landscape')
                elif height > width:
                    tags.append('portrait')
                else:
                    tags.append('square')
                
                # Resolution tags
                megapixels = (width * height) / 1000000
                if megapixels >= 20:
                    tags.append('high_resolution')
                elif megapixels >= 10:
                    tags.append('medium_resolution')
                else:
                    tags.append('low_resolution')
        
        elif media_type == MediaType.VIDEO:
            # Duration tags
            if 'duration' in metadata:
                duration = metadata['duration']
                if duration < 30:
                    tags.append('short_video')
                elif duration < 300:  # 5 minutes
                    tags.append('medium_video')
                else:
                    tags.append('long_video')
            
            # Quality tags
            if 'height' in metadata:
                height = metadata['height']
                if height >= 2160:
                    tags.append('4k')
                elif height >= 1080:
                    tags.append('hd')
                elif height >= 720:
                    tags.append('hd_720')
                else:
                    tags.append('sd')
        
        elif media_type == MediaType.AUDIO:
            # Duration tags
            if 'duration' in metadata:
                duration = metadata['duration']
                if duration < 60:
                    tags.append('short_audio')
                elif duration < 600:  # 10 minutes
                    tags.append('medium_audio')
                else:
                    tags.append('long_audio')
        
        return tags
    
    async def _apply_tags_to_file(
        self, 
        file_id: uuid.UUID, 
        tag_names: List[str], 
        confidence_threshold: float = 0.5
    ) -> List[str]:
        """Apply tags to a media file"""
        
        applied_tags = []
        
        for tag_name in tag_names:
            # Get or create tag
            tag = self.db.query(ContentTag).filter(ContentTag.name == tag_name).first()
            if not tag:
                tag = ContentTag(
                    name=tag_name,
                    category="auto_generated",
                    confidence_score=0.8  # Default confidence for auto-generated tags
                )
                self.db.add(tag)
                self.db.flush()
            
            # Skip if confidence is too low
            if tag.confidence_score < confidence_threshold:
                continue
            
            # Check if association already exists
            existing = self.db.query(MediaTagAssociation).filter(
                and_(
                    MediaTagAssociation.media_file_id == file_id,
                    MediaTagAssociation.tag_id == tag.id
                )
            ).first()
            
            if not existing:
                association = MediaTagAssociation(
                    media_file_id=file_id,
                    tag_id=tag.id
                )
                self.db.add(association)
                applied_tags.append(tag_name)
        
        self.db.commit()
        return applied_tags
    
    async def manage_content_workflow(
        self, 
        request: ContentModerationWorkflowRequest,
        user_id: uuid.UUID
    ) -> ContentModerationWorkflowResponse:
        """Manage content through moderation workflow"""
        
        media_file = self.db.query(MediaFile).filter(
            MediaFile.id == request.media_file_id
        ).first()
        
        if not media_file:
            raise ValueError("Media file not found")
        
        # Create moderation record
        moderation_record = ContentModerationRecord(
            media_file_id=request.media_file_id,
            moderation_type=request.workflow_type,
            moderator_user_id=user_id,
            moderation_result=request.action,
            confidence_score=request.confidence_score,
            flags_detected=request.flags_detected or [],
            moderation_notes=request.notes,
            reviewed_at=datetime.utcnow()
        )
        
        self.db.add(moderation_record)
        
        # Update media file status based on action
        if request.action == "approve":
            media_file.moderation_status = ModerationStatus.APPROVED
        elif request.action == "reject":
            media_file.moderation_status = ModerationStatus.REJECTED
        elif request.action == "flag":
            media_file.moderation_status = ModerationStatus.FLAGGED
        
        self.db.commit()
        
        return ContentModerationWorkflowResponse(
            media_file_id=request.media_file_id,
            workflow_status=request.action,
            moderation_record_id=moderation_record.id,
            processed_at=datetime.utcnow(),
            next_steps=self._get_next_workflow_steps(request.action, media_file)
        )
    
    def _get_next_workflow_steps(self, action: str, media_file: MediaFile) -> List[str]:
        """Get recommended next steps in the workflow"""
        
        steps = []
        
        if action == "approve":
            steps.append("Content approved and published")
            if media_file.privacy_level == PrivacyLevel.PRIVATE:
                steps.append("Consider making content public for wider reach")
        
        elif action == "reject":
            steps.append("Content rejected - notify uploader")
            steps.append("Provide feedback for improvement")
            steps.append("Consider content guidelines training")
        
        elif action == "flag":
            steps.append("Content flagged for further review")
            steps.append("Escalate to senior moderator")
            steps.append("Request additional context from uploader")
        
        return steps
    
    async def get_content_languages(self) -> List[Dict[str, Any]]:
        """Get available content languages"""
        
        languages = self.db.query(ContentLanguage).all()
        
        return [
            {
                "code": lang.language_code,
                "name": lang.language_name,
                "native_name": lang.native_name,
                "supported": lang.is_supported,
                "content_count": self._get_content_count_for_language(lang.language_code)
            }
            for lang in languages
        ]
    
    def _get_content_count_for_language(self, language_code: str) -> int:
        """Get count of content for a specific language"""
        
        return self.db.query(MediaFile).filter(
            MediaFile.content_language == language_code
        ).count()
    
    async def search_content_advanced(
        self, 
        request: ContentSearchRequest,
        user_id: uuid.UUID
    ) -> ContentSearchResponse:
        """Advanced content search with multiple criteria"""
        
        query = self.db.query(MediaFile)
        
        # Privacy filter
        query = query.filter(
            or_(
                MediaFile.uploaded_by_user_id == user_id,
                MediaFile.privacy_level == PrivacyLevel.PUBLIC
            )
        )
        
        # Apply filters
        if request.query:
            search_term = f"%{request.query}%"
            query = query.filter(
                or_(
                    MediaFile.title.ilike(search_term),
                    MediaFile.description.ilike(search_term),
                    MediaFile.filename.ilike(search_term)
                )
            )
        
        if request.media_types:
            query = query.filter(MediaFile.media_type.in_(request.media_types))
        
        if request.languages:
            query = query.filter(MediaFile.content_language.in_(request.languages))
        
        if request.date_range:
            if request.date_range.start_date:
                query = query.filter(MediaFile.uploaded_at >= request.date_range.start_date)
            if request.date_range.end_date:
                query = query.filter(MediaFile.uploaded_at <= request.date_range.end_date)
        
        if request.file_size_range:
            if request.file_size_range.min_size:
                query = query.filter(MediaFile.file_size >= request.file_size_range.min_size)
            if request.file_size_range.max_size:
                query = query.filter(MediaFile.file_size <= request.file_size_range.max_size)
        
        # Tag filtering
        if request.tags:
            tag_ids = self.db.query(ContentTag.id).filter(
                ContentTag.name.in_(request.tags)
            ).subquery()
            
            media_with_tags = self.db.query(MediaTagAssociation.media_file_id).filter(
                MediaTagAssociation.tag_id.in_(tag_ids)
            ).subquery()
            
            query = query.filter(MediaFile.id.in_(media_with_tags))
        
        # Get total count
        total_count = query.count()
        
        # Apply sorting
        if request.sort_by == "relevance" and request.query:
            # Simple relevance scoring based on title match
            query = query.order_by(
                desc(
                    func.case(
                        (MediaFile.title.ilike(f"%{request.query}%"), 3),
                        (MediaFile.description.ilike(f"%{request.query}%"), 2),
                        (MediaFile.filename.ilike(f"%{request.query}%"), 1),
                        else_=0
                    )
                )
            )
        elif request.sort_by == "upload_date":
            if request.sort_order == "desc":
                query = query.order_by(desc(MediaFile.uploaded_at))
            else:
                query = query.order_by(MediaFile.uploaded_at)
        elif request.sort_by == "file_size":
            if request.sort_order == "desc":
                query = query.order_by(desc(MediaFile.file_size))
            else:
                query = query.order_by(MediaFile.file_size)
        
        # Apply pagination
        offset = (request.page - 1) * request.limit
        results = query.offset(offset).limit(request.limit).all()
        
        return ContentSearchResponse(
            results=results,
            total_count=total_count,
            page=request.page,
            limit=request.limit,
            total_pages=(total_count + request.limit - 1) // request.limit,
            search_completed_at=datetime.utcnow()
        )