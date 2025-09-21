"""
Voice processing service with speech-to-text and text-to-speech capabilities.
"""
import asyncio
import io
import logging
import os
import tempfile
from typing import BinaryIO, Optional, Tuple
from uuid import UUID, uuid4

import librosa
import numpy as np
import soundfile as sf
import torch
import whisper
from gtts import gTTS
from langdetect import detect

from app.core.config import settings
from app.models.schemas import Language, VoiceGender

logger = logging.getLogger(__name__)


class VoiceProcessingService:
    """Voice processing service for speech-to-text and text-to-speech."""
    
    def __init__(self):
        """Initialize voice processing service."""
        self.whisper_model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.load_models()
    
    def load_models(self):
        """Load speech recognition models."""
        try:
            # Load Whisper model
            model_size = "base"  # Can be "tiny", "base", "small", "medium", "large"
            self.whisper_model = whisper.load_model(model_size, device=self.device)
            logger.info(f"Loaded Whisper model '{model_size}' on {self.device}")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {str(e)}")
            self.whisper_model = None
    
    async def transcribe_audio(
        self,
        audio_data: bytes,
        language: Optional[Language] = None,
        enhance_audio: bool = False
    ) -> Tuple[str, Optional[Language], float, float]:
        """
        Transcribe audio to text using Whisper.
        
        Args:
            audio_data: Audio file bytes
            language: Expected language (optional)
            enhance_audio: Whether to apply audio enhancement
            
        Returns:
            Tuple of (transcription, detected_language, confidence, duration)
        """
        if not self.whisper_model:
            raise RuntimeError("Whisper model not loaded")
        
        try:
            # Save audio data to temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_path = temp_file.name
            
            try:
                # Load and preprocess audio
                audio, sr = librosa.load(temp_path, sr=16000)
                
                # Apply audio enhancement if requested
                if enhance_audio:
                    audio = self._enhance_audio(audio, sr)
                
                # Calculate duration
                duration = len(audio) / sr
                
                # Prepare transcription options
                options = {
                    "fp16": False,
                    "language": language.value if language else None,
                    "task": "transcribe"
                }
                
                # Transcribe using Whisper
                result = self.whisper_model.transcribe(temp_path, **options)
                
                # Extract results
                transcription = result["text"].strip()
                detected_language = self._language_code_to_enum(result.get("language", "en"))
                
                # Calculate confidence (average of segment confidences)
                segments = result.get("segments", [])
                if segments:
                    confidence = np.mean([seg.get("no_speech_prob", 0.5) for seg in segments])
                    confidence = 1.0 - confidence  # Invert no_speech_prob
                else:
                    confidence = 0.8  # Default confidence
                
                logger.info(f"Transcription completed: {len(transcription)} characters, {duration:.2f}s")
                
                return transcription, detected_language, confidence, duration
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
        except Exception as e:
            logger.error(f"Error transcribing audio: {str(e)}")
            raise RuntimeError(f"Transcription failed: {str(e)}")
    
    async def synthesize_speech(
        self,
        text: str,
        language: Language = Language.ENGLISH,
        voice_gender: VoiceGender = VoiceGender.FEMALE,
        speech_rate: float = 1.0,
        slow: bool = False
    ) -> Tuple[bytes, str]:
        """
        Synthesize speech from text using gTTS.
        
        Args:
            text: Text to synthesize
            language: Target language
            voice_gender: Voice gender preference
            speech_rate: Speech rate multiplier
            slow: Whether to use slow speech
            
        Returns:
            Tuple of (audio_bytes, audio_format)
        """
        try:
            # Validate text length
            if len(text) > 2000:
                text = text[:2000] + "..."
            
            # Get gTTS language code
            gtts_lang = self._get_gtts_language_code(language)
            
            # Create gTTS object
            tts = gTTS(
                text=text,
                lang=gtts_lang,
                slow=slow or speech_rate < 0.8,
                tld='com'  # Use .com domain for better quality
            )
            
            # Generate audio to bytes buffer
            audio_buffer = io.BytesIO()
            tts.write_to_fp(audio_buffer)
            audio_buffer.seek(0)
            audio_bytes = audio_buffer.getvalue()
            
            # Apply speech rate adjustment if needed
            if speech_rate != 1.0 and not slow:
                audio_bytes = await self._adjust_speech_rate(audio_bytes, speech_rate)
            
            logger.info(f"Speech synthesis completed: {len(text)} characters -> {len(audio_bytes)} bytes")
            
            return audio_bytes, "mp3"
            
        except Exception as e:
            logger.error(f"Error synthesizing speech: {str(e)}")
            raise RuntimeError(f"Speech synthesis failed: {str(e)}")
    
    async def detect_language(self, text: str) -> Optional[Language]:
        """Detect language of text."""
        try:
            detected_lang = detect(text)
            return self._language_code_to_enum(detected_lang)
        except Exception:
            return None
    
    def _enhance_audio(self, audio: np.ndarray, sr: int) -> np.ndarray:
        """Apply audio enhancement techniques."""
        try:
            # Noise reduction using spectral subtraction (simplified)
            stft = librosa.stft(audio)
            magnitude = np.abs(stft)
            phase = np.angle(stft)
            
            # Estimate noise from first 0.5 seconds
            noise_frames = int(0.5 * sr / 512)  # 512 is default hop_length
            noise_mag = np.mean(magnitude[:, :noise_frames], axis=1, keepdims=True)
            
            # Spectral subtraction
            alpha = 2.0  # Subtraction factor
            enhanced_magnitude = magnitude - alpha * noise_mag
            enhanced_magnitude = np.maximum(enhanced_magnitude, 0.1 * magnitude)
            
            # Reconstruct audio
            enhanced_stft = enhanced_magnitude * np.exp(1j * phase)
            enhanced_audio = librosa.istft(enhanced_stft)
            
            # Normalize
            enhanced_audio = enhanced_audio / np.max(np.abs(enhanced_audio))
            
            return enhanced_audio
            
        except Exception as e:
            logger.warning(f"Audio enhancement failed: {str(e)}")
            return audio
    
    async def _adjust_speech_rate(self, audio_bytes: bytes, rate: float) -> bytes:
        """Adjust speech rate of audio."""
        try:
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_input:
                temp_input.write(audio_bytes)
                temp_input_path = temp_input.name
            
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_output:
                temp_output_path = temp_output.name
            
            try:
                # Load audio
                audio, sr = librosa.load(temp_input_path, sr=None)
                
                # Adjust speed
                audio_stretched = librosa.effects.time_stretch(audio, rate=rate)
                
                # Save adjusted audio
                sf.write(temp_output_path, audio_stretched, sr)
                
                # Read back as bytes
                with open(temp_output_path, 'rb') as f:
                    adjusted_bytes = f.read()
                
                return adjusted_bytes
                
            finally:
                # Clean up
                for path in [temp_input_path, temp_output_path]:
                    if os.path.exists(path):
                        os.unlink(path)
                        
        except Exception as e:
            logger.warning(f"Speech rate adjustment failed: {str(e)}")
            return audio_bytes
    
    def _get_gtts_language_code(self, language: Language) -> str:
        """Convert Language enum to gTTS language code."""
        language_map = {
            Language.ENGLISH: "en",
            Language.SPANISH: "es",
            Language.FRENCH: "fr",
            Language.GERMAN: "de",
            Language.ITALIAN: "it",
            Language.PORTUGUESE: "pt",
            Language.ARABIC: "ar",
            Language.CHINESE: "zh",
            Language.JAPANESE: "ja",
            Language.KOREAN: "ko",
        }
        return language_map.get(language, "en")
    
    def _language_code_to_enum(self, lang_code: str) -> Language:
        """Convert language code to Language enum."""
        code_map = {
            "en": Language.ENGLISH,
            "es": Language.SPANISH,
            "fr": Language.FRENCH,
            "de": Language.GERMAN,
            "it": Language.ITALIAN,
            "pt": Language.PORTUGUESE,
            "ar": Language.ARABIC,
            "zh": Language.CHINESE,
            "ja": Language.JAPANESE,
            "ko": Language.KOREAN,
        }
        return code_map.get(lang_code, Language.ENGLISH)
    
    def validate_audio_format(self, audio_data: bytes) -> bool:
        """Validate audio format and size."""
        try:
            # Check file size (max 25MB)
            if len(audio_data) > settings.max_file_size:
                return False
            
            # Try to load with librosa to validate format
            with tempfile.NamedTemporaryFile() as temp_file:
                temp_file.write(audio_data)
                temp_file.flush()
                
                audio, sr = librosa.load(temp_file.name, sr=None)
                
                # Check duration (max 10 minutes)
                duration = len(audio) / sr
                if duration > 600:  # 10 minutes
                    return False
                    
                return True
                
        except Exception as e:
            logger.warning(f"Audio validation failed: {str(e)}")
            return False
    
    async def get_audio_info(self, audio_data: bytes) -> dict:
        """Get audio file information."""
        try:
            with tempfile.NamedTemporaryFile() as temp_file:
                temp_file.write(audio_data)
                temp_file.flush()
                
                audio, sr = librosa.load(temp_file.name, sr=None)
                
                return {
                    "duration": len(audio) / sr,
                    "sample_rate": sr,
                    "channels": 1 if audio.ndim == 1 else audio.shape[0],
                    "size_bytes": len(audio_data),
                    "format": "audio"
                }
                
        except Exception as e:
            logger.error(f"Error getting audio info: {str(e)}")
            return {}


# Wake word detection (simplified implementation)
class WakeWordDetector:
    """Wake word detection for hands-free activation."""
    
    def __init__(self, wake_word: str = "hey touriquest"):
        """Initialize wake word detector."""
        self.wake_word = wake_word.lower()
        self.threshold = 0.7
        
    async def detect_wake_word(self, audio_text: str) -> bool:
        """Detect wake word in transcribed text."""
        try:
            text_lower = audio_text.lower()
            
            # Simple keyword matching
            wake_words = self.wake_word.split()
            found_words = sum(1 for word in wake_words if word in text_lower)
            
            confidence = found_words / len(wake_words)
            return confidence >= self.threshold
            
        except Exception as e:
            logger.error(f"Wake word detection error: {str(e)}")
            return False


# Global service instances
voice_service = VoiceProcessingService()
wake_word_detector = WakeWordDetector()