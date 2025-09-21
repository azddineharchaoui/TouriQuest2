"""
Audio processing service for multimedia content.
Handles audio guide processing, format conversion, segmentation, and optimization.
"""

import os
import uuid
import json
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

import librosa
import soundfile as sf
import numpy as np
from pydub import AudioSegment
from pydub.silence import split_on_silence
import ffmpeg

from app.core.config import get_settings
from app.services.base import BaseService

logger = logging.getLogger(__name__)


@dataclass
class AudioProcessingResult:
    """Result of audio processing operation."""
    success: bool
    file_path: Optional[str] = None
    cdn_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    file_size_bytes: Optional[int] = None
    segments: Optional[List[Dict]] = None
    metadata: Optional[Dict] = None
    error_message: Optional[str] = None


@dataclass
class AudioSegment:
    """Represents a processed audio segment."""
    segment_id: str
    start_time: float
    end_time: float
    duration: float
    file_path: str
    file_size_bytes: int


class AudioProcessor(BaseService):
    """Service for processing audio guide content."""
    
    def __init__(self):
        super().__init__()
        self.settings = get_settings()
        self.temp_dir = Path(self.settings.TEMP_DIRECTORY)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Audio processing settings
        self.target_bitrate = self.settings.AUDIO_GUIDE_BITRATE_KBPS
        self.target_sample_rate = self.settings.AUDIO_GUIDE_SAMPLE_RATE_HZ
        self.segment_duration = self.settings.AUDIO_GUIDE_SEGMENT_DURATION_SECONDS
        self.max_file_size = self.settings.AUDIO_GUIDE_MAX_FILE_SIZE_MB * 1024 * 1024
    
    async def process_audio_guide(
        self,
        file_path: str,
        language_code: str,
        quality_level: str = "high"
    ) -> AudioProcessingResult:
        """
        Process an audio guide file with optimization and segmentation.
        
        Args:
            file_path: Path to the source audio file
            language_code: Language code for the audio guide
            quality_level: Processing quality (high, medium, low)
            
        Returns:
            AudioProcessingResult with processing details
        """
        try:
            logger.info(f"Starting audio processing for {file_path}")
            
            # Validate input file
            if not os.path.exists(file_path):
                return AudioProcessingResult(
                    success=False,
                    error_message=f"Input file not found: {file_path}"
                )
            
            # Load audio file
            audio_data, sample_rate = librosa.load(file_path, sr=None)
            duration = librosa.get_duration(y=audio_data, sr=sample_rate)
            
            # Check duration limits
            if duration > self.settings.AUDIO_GUIDE_MAX_DURATION_SECONDS:
                return AudioProcessingResult(
                    success=False,
                    error_message=f"Audio duration ({duration}s) exceeds maximum allowed ({self.settings.AUDIO_GUIDE_MAX_DURATION_SECONDS}s)"
                )
            
            # Generate unique processing ID
            process_id = str(uuid.uuid4())
            output_dir = self.temp_dir / f"audio_processing_{process_id}"
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Process audio based on quality level
            processed_audio = await self._optimize_audio(
                audio_data, sample_rate, quality_level
            )
            
            # Create main processed file
            main_file_path = output_dir / f"main_audio_{process_id}.mp3"
            await self._save_audio_file(
                processed_audio, 
                self.target_sample_rate,
                str(main_file_path)
            )
            
            # Create segments for progressive download
            segments = await self._create_audio_segments(
                processed_audio,
                self.target_sample_rate,
                output_dir,
                process_id
            )
            
            # Extract metadata
            metadata = await self._extract_audio_metadata(
                processed_audio, 
                self.target_sample_rate,
                language_code
            )
            
            # Get file size
            file_size = os.path.getsize(main_file_path)
            
            # Prepare result
            result = AudioProcessingResult(
                success=True,
                file_path=str(main_file_path),
                duration_seconds=duration,
                file_size_bytes=file_size,
                segments=[{
                    "segment_id": seg.segment_id,
                    "start_time": seg.start_time,
                    "end_time": seg.end_time,
                    "duration": seg.duration,
                    "file_path": seg.file_path,
                    "file_size_bytes": seg.file_size_bytes
                } for seg in segments],
                metadata=metadata
            )
            
            logger.info(f"Audio processing completed successfully for {file_path}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing audio: {str(e)}")
            return AudioProcessingResult(
                success=False,
                error_message=f"Processing failed: {str(e)}"
            )
    
    async def _optimize_audio(
        self,
        audio_data: np.ndarray,
        sample_rate: int,
        quality_level: str
    ) -> np.ndarray:
        """Optimize audio based on quality level."""
        
        # Normalize audio
        audio_data = librosa.util.normalize(audio_data)
        
        # Apply quality-specific processing
        if quality_level == "high":
            # Minimal processing for high quality
            processed = audio_data
            
        elif quality_level == "medium":
            # Apply moderate noise reduction
            processed = await self._apply_noise_reduction(audio_data, sample_rate)
            
        elif quality_level == "low":
            # Aggressive compression and processing
            processed = await self._apply_noise_reduction(audio_data, sample_rate)
            processed = await self._apply_dynamic_range_compression(processed)
            
        else:
            processed = audio_data
        
        # Resample if needed
        if sample_rate != self.target_sample_rate:
            processed = librosa.resample(
                processed, 
                orig_sr=sample_rate, 
                target_sr=self.target_sample_rate
            )
        
        return processed
    
    async def _apply_noise_reduction(
        self,
        audio_data: np.ndarray,
        sample_rate: int
    ) -> np.ndarray:
        """Apply noise reduction to audio."""
        # Simple spectral gating for noise reduction
        # This is a basic implementation - could be enhanced with more sophisticated algorithms
        
        # Compute spectral features
        stft = librosa.stft(audio_data)
        magnitude = np.abs(stft)
        
        # Apply spectral gating (simple threshold-based)
        noise_threshold = np.percentile(magnitude, 10)  # Bottom 10% as noise floor
        magnitude_cleaned = np.where(magnitude > noise_threshold * 2, magnitude, magnitude * 0.5)
        
        # Reconstruct audio
        stft_cleaned = magnitude_cleaned * np.exp(1j * np.angle(stft))
        audio_cleaned = librosa.istft(stft_cleaned)
        
        return audio_cleaned
    
    async def _apply_dynamic_range_compression(
        self,
        audio_data: np.ndarray
    ) -> np.ndarray:
        """Apply dynamic range compression."""
        # Simple compressor implementation
        threshold = 0.3
        ratio = 4.0
        
        # Apply compression
        compressed = np.where(
            np.abs(audio_data) > threshold,
            np.sign(audio_data) * (threshold + (np.abs(audio_data) - threshold) / ratio),
            audio_data
        )
        
        return compressed
    
    async def _save_audio_file(
        self,
        audio_data: np.ndarray,
        sample_rate: int,
        output_path: str
    ) -> None:
        """Save processed audio to file."""
        # Save as WAV first
        temp_wav = output_path.replace('.mp3', '_temp.wav')
        sf.write(temp_wav, audio_data, sample_rate)
        
        # Convert to MP3 using ffmpeg
        (
            ffmpeg
            .input(temp_wav)
            .output(
                output_path,
                acodec='mp3',
                audio_bitrate=f'{self.target_bitrate}k',
                ar=self.target_sample_rate
            )
            .overwrite_output()
            .run(quiet=True)
        )
        
        # Clean up temp file
        os.remove(temp_wav)
    
    async def _create_audio_segments(
        self,
        audio_data: np.ndarray,
        sample_rate: int,
        output_dir: Path,
        process_id: str
    ) -> List[AudioSegment]:
        """Create audio segments for progressive download."""
        segments = []
        segment_samples = int(self.segment_duration * sample_rate)
        total_samples = len(audio_data)
        
        segment_count = 0
        for start_sample in range(0, total_samples, segment_samples):
            end_sample = min(start_sample + segment_samples, total_samples)
            segment_data = audio_data[start_sample:end_sample]
            
            # Skip very short segments
            if len(segment_data) < sample_rate * 0.5:  # Less than 0.5 seconds
                continue
            
            segment_id = f"{process_id}_segment_{segment_count:03d}"
            segment_file = output_dir / f"{segment_id}.mp3"
            
            # Save segment
            await self._save_audio_file(
                segment_data,
                sample_rate,
                str(segment_file)
            )
            
            # Calculate timing
            start_time = start_sample / sample_rate
            end_time = end_sample / sample_rate
            duration = end_time - start_time
            file_size = os.path.getsize(segment_file)
            
            segments.append(AudioSegment(
                segment_id=segment_id,
                start_time=start_time,
                end_time=end_time,
                duration=duration,
                file_path=str(segment_file),
                file_size_bytes=file_size
            ))
            
            segment_count += 1
        
        return segments
    
    async def _extract_audio_metadata(
        self,
        audio_data: np.ndarray,
        sample_rate: int,
        language_code: str
    ) -> Dict:
        """Extract comprehensive audio metadata."""
        
        # Basic audio properties
        duration = len(audio_data) / sample_rate
        channels = 1 if audio_data.ndim == 1 else audio_data.shape[0]
        
        # Audio analysis
        rms_energy = librosa.feature.rms(y=audio_data)[0]
        spectral_centroid = librosa.feature.spectral_centroid(y=audio_data, sr=sample_rate)[0]
        zero_crossing_rate = librosa.feature.zero_crossing_rate(audio_data)[0]
        
        # Silence detection
        silence_intervals = self._detect_silence(audio_data, sample_rate)
        
        # Speech characteristics (basic)
        tempo, _ = librosa.beat.beat_track(y=audio_data, sr=sample_rate)
        
        return {
            "duration_seconds": duration,
            "sample_rate_hz": sample_rate,
            "channels": channels,
            "language_code": language_code,
            "audio_features": {
                "rms_energy_mean": float(np.mean(rms_energy)),
                "rms_energy_std": float(np.std(rms_energy)),
                "spectral_centroid_mean": float(np.mean(spectral_centroid)),
                "zero_crossing_rate_mean": float(np.mean(zero_crossing_rate)),
                "estimated_tempo": float(tempo)
            },
            "silence_analysis": {
                "silence_intervals": silence_intervals,
                "total_silence_duration": sum([interval[1] - interval[0] for interval in silence_intervals]),
                "speech_to_silence_ratio": duration / max(sum([interval[1] - interval[0] for interval in silence_intervals]), 0.1)
            },
            "quality_metrics": {
                "dynamic_range": float(np.max(audio_data) - np.min(audio_data)),
                "peak_amplitude": float(np.max(np.abs(audio_data))),
                "clipping_detected": bool(np.any(np.abs(audio_data) >= 0.99))
            }
        }
    
    def _detect_silence(
        self,
        audio_data: np.ndarray,
        sample_rate: int,
        threshold_db: float = -40.0
    ) -> List[Tuple[float, float]]:
        """Detect silence intervals in audio."""
        
        # Convert to AudioSegment for silence detection
        audio_int16 = (audio_data * 32767).astype(np.int16)
        audio_segment = AudioSegment(
            audio_int16.tobytes(),
            frame_rate=sample_rate,
            sample_width=2,
            channels=1
        )
        
        # Split on silence
        chunks = split_on_silence(
            audio_segment,
            min_silence_len=500,  # 500ms minimum silence
            silence_thresh=threshold_db,
            keep_silence=100  # Keep 100ms of silence
        )
        
        # Calculate silence intervals
        silence_intervals = []
        current_time = 0.0
        
        for i, chunk in enumerate(chunks):
            chunk_duration = len(chunk) / 1000.0  # Convert to seconds
            
            if i > 0:
                # There was silence before this chunk
                silence_start = current_time
                silence_end = current_time
                silence_intervals.append((silence_start, silence_end))
            
            current_time += chunk_duration
        
        return silence_intervals
    
    async def validate_audio_file(self, file_path: str) -> Dict:
        """Validate an audio file for processing."""
        try:
            # Check file existence
            if not os.path.exists(file_path):
                return {"valid": False, "error": "File not found"}
            
            # Check file size
            file_size = os.path.getsize(file_path)
            if file_size > self.max_file_size:
                return {
                    "valid": False, 
                    "error": f"File size ({file_size} bytes) exceeds maximum ({self.max_file_size} bytes)"
                }
            
            # Try to load audio
            audio_data, sample_rate = librosa.load(file_path, sr=None)
            duration = librosa.get_duration(y=audio_data, sr=sample_rate)
            
            # Check duration
            if duration > self.settings.AUDIO_GUIDE_MAX_DURATION_SECONDS:
                return {
                    "valid": False,
                    "error": f"Duration ({duration}s) exceeds maximum ({self.settings.AUDIO_GUIDE_MAX_DURATION_SECONDS}s)"
                }
            
            return {
                "valid": True,
                "metadata": {
                    "duration_seconds": duration,
                    "sample_rate_hz": sample_rate,
                    "channels": 1 if audio_data.ndim == 1 else audio_data.shape[0],
                    "file_size_bytes": file_size
                }
            }
            
        except Exception as e:
            return {"valid": False, "error": f"Validation failed: {str(e)}"}
    
    async def cleanup_processing_files(self, process_id: str) -> None:
        """Clean up temporary processing files."""
        try:
            output_dir = self.temp_dir / f"audio_processing_{process_id}"
            if output_dir.exists():
                import shutil
                shutil.rmtree(output_dir)
                logger.info(f"Cleaned up processing files for {process_id}")
        except Exception as e:
            logger.error(f"Error cleaning up processing files: {str(e)}")