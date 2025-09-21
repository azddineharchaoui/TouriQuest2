"""
Voice processing API endpoints.
"""
import logging
import tempfile
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.models.schemas import (
    VoiceTranscriptionRequest, VoiceTranscription,
    VoiceSynthesisRequest, VoiceSynthesis,
    Language, VoiceGender, StandardResponse
)
from app.services import voice_service, wake_word_detector
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/voice", tags=["Voice Processing"])


@router.post("/transcribe", response_model=VoiceTranscription)
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    language: Optional[Language] = Form(None),
    enhance_audio: bool = Form(False),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Transcribe audio file to text."""
    try:
        user_id = UUID(current_user["user_id"])
        
        # Validate file
        if not audio_file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No audio file provided"
            )
        
        # Read audio data
        audio_data = await audio_file.read()
        
        # Validate audio format and size
        if not voice_service.validate_audio_format(audio_data):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid audio format or file too large"
            )
        
        # Transcribe audio
        transcription, detected_language, confidence, duration = await voice_service.transcribe_audio(
            audio_data, language, enhance_audio
        )
        
        # Check for wake word
        wake_word_detected = await wake_word_detector.detect_wake_word(transcription)
        
        # Create transcription record
        transcription_record = VoiceTranscription(
            user_id=user_id,
            audio_file_url=f"temp/{audio_file.filename}",  # Would be actual file URL in production
            transcription=transcription,
            language=detected_language,
            confidence=confidence,
            duration=duration
        )
        
        # Add metadata
        transcription_record.metadata = {
            "wake_word_detected": wake_word_detected,
            "enhanced": enhance_audio,
            "original_filename": audio_file.filename
        }
        
        logger.info(f"Audio transcribed for user {user_id}: {len(transcription)} characters")
        return transcription_record
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error transcribing audio: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to transcribe audio"
        )


@router.post("/synthesize")
async def synthesize_speech(
    request: VoiceSynthesisRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Convert text to speech."""
    try:
        user_id = UUID(current_user["user_id"])
        
        # Validate text length
        if len(request.text) > 2000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text too long (max 2000 characters)"
            )
        
        # Synthesize speech
        audio_bytes, audio_format = await voice_service.synthesize_speech(
            request.text,
            request.language,
            request.voice_gender,
            request.speech_rate,
            request.slow
        )
        
        # Create synthesis record
        synthesis_record = VoiceSynthesis(
            user_id=user_id,
            text=request.text,
            language=request.language,
            voice_gender=request.voice_gender,
            speech_rate=request.speech_rate,
            audio_file_url="temp/synthesis.mp3"  # Would be actual URL in production
        )
        
        logger.info(f"Speech synthesized for user {user_id}: {len(request.text)} characters")
        
        # Return audio file
        return Response(
            content=audio_bytes,
            media_type=f"audio/{audio_format}",
            headers={
                "Content-Disposition": f"attachment; filename=speech.{audio_format}",
                "X-Synthesis-ID": str(synthesis_record.id),
                "X-Text-Length": str(len(request.text)),
                "X-Language": request.language.value,
                "X-Voice-Gender": request.voice_gender.value
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error synthesizing speech: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to synthesize speech"
        )


@router.post("/validate", response_model=StandardResponse)
async def validate_audio(
    audio_file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Validate audio file format and properties."""
    try:
        # Read audio data
        audio_data = await audio_file.read()
        
        # Validate audio
        is_valid = voice_service.validate_audio_format(audio_data)
        
        if is_valid:
            # Get audio info
            audio_info = await voice_service.get_audio_info(audio_data)
            
            return StandardResponse(
                success=True,
                message="Audio file is valid",
                data=audio_info
            )
        else:
            return StandardResponse(
                success=False,
                message="Invalid audio file format or size"
            )
            
    except Exception as e:
        logger.error(f"Error validating audio: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate audio file"
        )


@router.post("/detect-language", response_model=StandardResponse)
async def detect_language(
    text: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Detect language of text."""
    try:
        detected_language = await voice_service.detect_language(text)
        
        return StandardResponse(
            success=True,
            message="Language detected",
            data={
                "detected_language": detected_language.value if detected_language else None,
                "text_length": len(text)
            }
        )
        
    except Exception as e:
        logger.error(f"Error detecting language: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to detect language"
        )


@router.get("/supported-languages", response_model=StandardResponse)
async def get_supported_languages():
    """Get list of supported languages for voice processing."""
    try:
        languages = [
            {
                "code": lang.value,
                "name": lang.name.title(),
                "tts_supported": True,
                "stt_supported": True
            }
            for lang in Language
        ]
        
        return StandardResponse(
            success=True,
            message="Supported languages retrieved",
            data={"languages": languages}
        )
        
    except Exception as e:
        logger.error(f"Error getting supported languages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get supported languages"
        )


@router.get("/voice-options", response_model=StandardResponse)
async def get_voice_options():
    """Get available voice options."""
    try:
        voice_options = {
            "genders": [
                {"value": gender.value, "name": gender.name.title()}
                for gender in VoiceGender
            ],
            "speech_rates": {
                "min": 0.5,
                "max": 2.0,
                "default": 1.0,
                "step": 0.1
            },
            "languages": [
                {"code": lang.value, "name": lang.name.title()}
                for lang in Language
            ]
        }
        
        return StandardResponse(
            success=True,
            message="Voice options retrieved",
            data=voice_options
        )
        
    except Exception as e:
        logger.error(f"Error getting voice options: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get voice options"
        )