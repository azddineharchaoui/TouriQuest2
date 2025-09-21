"""
Embedding service for context retrieval and semantic search.
"""
import logging
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from uuid import UUID

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import redis.asyncio as redis
import json

from app.core.config import settings
from app.models.schemas import Language

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating and managing text embeddings."""
    
    def __init__(self):
        """Initialize embedding service."""
        self.model = None
        self.redis_client = None
        self.model_name = "all-MiniLM-L6-v2"  # Lightweight multilingual model
        self._setup_model()
        self._setup_redis()
    
    def _setup_model(self):
        """Load the sentence transformer model."""
        try:
            self.model = SentenceTransformer(self.model_name)
            logger.info(f"Loaded embedding model: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {str(e)}")
            self.model = None
    
    async def _setup_redis(self):
        """Setup Redis connection for caching embeddings."""
        try:
            self.redis_client = redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Redis connection established for embeddings")
        except Exception as e:
            logger.error(f"Failed to connect to Redis for embeddings: {str(e)}")
            self.redis_client = None
    
    async def generate_embedding(self, text: str, cache_key: Optional[str] = None) -> List[float]:
        """Generate embedding for text."""
        if not self.model:
            raise RuntimeError("Embedding model not loaded")
        
        try:
            # Check cache first
            if cache_key and self.redis_client:
                cached_embedding = await self._get_cached_embedding(cache_key)
                if cached_embedding:
                    return cached_embedding
            
            # Clean and prepare text
            cleaned_text = self._preprocess_text(text)
            
            # Generate embedding
            embedding = self.model.encode(cleaned_text, convert_to_tensor=False)
            embedding_list = embedding.tolist()
            
            # Cache embedding
            if cache_key and self.redis_client:
                await self._cache_embedding(cache_key, embedding_list)
            
            logger.debug(f"Generated embedding for text: {len(cleaned_text)} chars -> {len(embedding_list)} dimensions")
            return embedding_list
            
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise
    
    async def generate_batch_embeddings(
        self, 
        texts: List[str], 
        cache_keys: Optional[List[str]] = None
    ) -> List[List[float]]:
        """Generate embeddings for multiple texts efficiently."""
        if not self.model:
            raise RuntimeError("Embedding model not loaded")
        
        try:
            embeddings = []
            texts_to_process = []
            indices_to_process = []
            
            # Check cache for each text
            for i, text in enumerate(texts):
                cache_key = cache_keys[i] if cache_keys and i < len(cache_keys) else None
                
                if cache_key and self.redis_client:
                    cached_embedding = await self._get_cached_embedding(cache_key)
                    if cached_embedding:
                        embeddings.append(cached_embedding)
                        continue
                
                # Text needs processing
                embeddings.append(None)
                texts_to_process.append(self._preprocess_text(text))
                indices_to_process.append(i)
            
            # Process uncached texts in batch
            if texts_to_process:
                batch_embeddings = self.model.encode(texts_to_process, convert_to_tensor=False)
                
                # Fill in the results and cache
                for j, i in enumerate(indices_to_process):
                    embedding_list = batch_embeddings[j].tolist()
                    embeddings[i] = embedding_list
                    
                    # Cache if key provided
                    if cache_keys and i < len(cache_keys) and cache_keys[i]:
                        await self._cache_embedding(cache_keys[i], embedding_list)
            
            logger.info(f"Generated batch embeddings: {len(texts)} texts")
            return embeddings
            
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {str(e)}")
            raise
    
    def calculate_similarity(
        self, 
        embedding1: List[float], 
        embedding2: List[float]
    ) -> float:
        """Calculate cosine similarity between two embeddings."""
        try:
            emb1 = np.array(embedding1).reshape(1, -1)
            emb2 = np.array(embedding2).reshape(1, -1)
            
            similarity = cosine_similarity(emb1, emb2)[0][0]
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Error calculating similarity: {str(e)}")
            return 0.0
    
    def find_most_similar(
        self,
        query_embedding: List[float],
        candidate_embeddings: List[List[float]],
        top_k: int = 5
    ) -> List[Tuple[int, float]]:
        """Find most similar embeddings to query."""
        try:
            if not candidate_embeddings:
                return []
            
            query_emb = np.array(query_embedding).reshape(1, -1)
            candidate_embs = np.array(candidate_embeddings)
            
            # Calculate similarities
            similarities = cosine_similarity(query_emb, candidate_embs)[0]
            
            # Get top k most similar
            top_indices = np.argsort(similarities)[::-1][:top_k]
            
            results = [
                (int(idx), float(similarities[idx]))
                for idx in top_indices
                if similarities[idx] > 0.1  # Minimum similarity threshold
            ]
            
            return results
            
        except Exception as e:
            logger.error(f"Error finding similar embeddings: {str(e)}")
            return []
    
    def _preprocess_text(self, text: str) -> str:
        """Preprocess text for embedding generation."""
        # Basic text cleaning
        cleaned = text.strip()
        
        # Remove excessive whitespace
        cleaned = ' '.join(cleaned.split())
        
        # Truncate if too long (model limit is usually 512 tokens)
        max_chars = 2000  # Conservative limit
        if len(cleaned) > max_chars:
            cleaned = cleaned[:max_chars] + "..."
        
        return cleaned
    
    async def _get_cached_embedding(self, cache_key: str) -> Optional[List[float]]:
        """Get embedding from cache."""
        try:
            cached_data = await self.redis_client.get(f"embedding:{cache_key}")
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logger.warning(f"Error getting cached embedding: {str(e)}")
        return None
    
    async def _cache_embedding(self, cache_key: str, embedding: List[float]):
        """Cache embedding."""
        try:
            await self.redis_client.setex(
                f"embedding:{cache_key}",
                86400,  # 24 hours TTL
                json.dumps(embedding)
            )
        except Exception as e:
            logger.warning(f"Error caching embedding: {str(e)}")


class ConversationContextRetriever:
    """Retrieves relevant conversation context using embeddings."""
    
    def __init__(self, embedding_service: EmbeddingService):
        """Initialize context retriever."""
        self.embedding_service = embedding_service
    
    async def find_relevant_context(
        self,
        query: str,
        conversation_history: List[Dict[str, Any]],
        max_context_items: int = 5
    ) -> List[Dict[str, Any]]:
        """Find relevant context from conversation history."""
        try:
            if not conversation_history:
                return []
            
            # Generate query embedding
            query_embedding = await self.embedding_service.generate_embedding(query)
            
            # Extract texts and generate embeddings for history
            history_texts = []
            for msg in conversation_history:
                content = msg.get("content", "")
                if content and len(content.strip()) > 10:  # Skip very short messages
                    history_texts.append(content)
            
            if not history_texts:
                return []
            
            # Generate embeddings for history
            history_embeddings = await self.embedding_service.generate_batch_embeddings(
                history_texts
            )
            
            # Find most similar messages
            similar_indices = self.embedding_service.find_most_similar(
                query_embedding,
                history_embeddings,
                top_k=max_context_items
            )
            
            # Return relevant context
            relevant_context = []
            for idx, similarity in similar_indices:
                if idx < len(conversation_history):
                    context_item = conversation_history[idx].copy()
                    context_item["relevance_score"] = similarity
                    relevant_context.append(context_item)
            
            return relevant_context
            
        except Exception as e:
            logger.error(f"Error finding relevant context: {str(e)}")
            return []
    
    async def summarize_conversation_topics(
        self,
        conversation_history: List[Dict[str, Any]]
    ) -> List[str]:
        """Extract main topics from conversation using clustering."""
        try:
            if not conversation_history:
                return []
            
            # Extract meaningful messages
            texts = []
            for msg in conversation_history:
                content = msg.get("content", "")
                if content and len(content.strip()) > 20 and not msg.get("is_from_ai", False):
                    texts.append(content)
            
            if len(texts) < 2:
                return []
            
            # Generate embeddings
            embeddings = await self.embedding_service.generate_batch_embeddings(texts)
            
            # Simple topic extraction based on similarity clustering
            topics = []
            processed = set()
            
            for i, embedding in enumerate(embeddings):
                if i in processed:
                    continue
                
                # Find similar messages
                similar_indices = self.embedding_service.find_most_similar(
                    embedding,
                    embeddings,
                    top_k=3
                )
                
                # Extract topic keywords from similar messages
                topic_texts = [texts[idx] for idx, _ in similar_indices if idx not in processed]
                if topic_texts:
                    topic = self._extract_topic_keywords(topic_texts)
                    topics.append(topic)
                    
                    # Mark as processed
                    for idx, _ in similar_indices:
                        processed.add(idx)
            
            return topics[:5]  # Return top 5 topics
            
        except Exception as e:
            logger.error(f"Error summarizing topics: {str(e)}")
            return []
    
    def _extract_topic_keywords(self, texts: List[str]) -> str:
        """Extract topic keywords from texts (simplified implementation)."""
        # Simple keyword extraction - in production, use more sophisticated NLP
        all_words = []
        for text in texts:
            words = text.lower().split()
            # Filter out common words
            filtered_words = [
                word for word in words 
                if len(word) > 3 and word not in {
                    "what", "where", "when", "how", "why", "can", "could", 
                    "would", "should", "the", "and", "or", "but", "in", "on", "at"
                }
            ]
            all_words.extend(filtered_words[:3])  # Take first 3 meaningful words
        
        # Count word frequency
        word_counts = {}
        for word in all_words:
            word_counts[word] = word_counts.get(word, 0) + 1
        
        # Get most common words
        if word_counts:
            sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
            top_words = [word for word, count in sorted_words[:3]]
            return " ".join(top_words).title()
        
        return "General Discussion"


# Global service instances
embedding_service = EmbeddingService()
context_retriever = ConversationContextRetriever(embedding_service)