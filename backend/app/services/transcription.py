"""
TranscriptionService
====================
Wraps faster-whisper to provide:
  - Singleton model loading (model is loaded once at startup)
  - Synchronous transcription of a float32 numpy array
  - Partial result emission based on a configurable time window

faster-whisper on CPU:
  - model_size  : "tiny" (~39 MB)  ← default, best CPU speed
  - device      : "cpu"
  - compute_type: "int8"           ← quantised, fastest on CPU without AVX-512
"""

import io
from typing import Generator

import numpy as np
from faster_whisper import WhisperModel

from app.core.logging import get_logger
from app.core.settings import get_settings

logger = get_logger(__name__)
settings = get_settings()


class TranscriptionService:
    _instance: "TranscriptionService | None" = None
    _model: WhisperModel | None = None

    
    @classmethod
    def get_instance(cls) -> "TranscriptionService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance


    def load_model(self) -> None:
        """
        Download (first run) and load the Whisper model into memory.
        Called once at application startup so the first WebSocket connection
        is not penalised by model load time.
        """
        if self._model is not None:
            return

        logger.info(
            "Loading Whisper model: size=%s device=%s compute_type=%s",
            settings.whisper_model_size,
            settings.whisper_device,
            settings.whisper_compute_type,
        )

        self._model = WhisperModel(
            model_size_or_path=settings.whisper_model_size,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
            download_root=settings.whisper_model_dir,
        )

        logger.info("Whisper model loaded successfully.")


    def transcribe_full(self, audio: np.ndarray) -> str:
        """
        Transcribe a complete audio buffer and return the full transcript string.

        Parameters
        ----------
        audio : float32 numpy array at 16 kHz, shape (N,)

        Returns
        -------
        Full transcript text (empty string if nothing detected).
        """
        if self._model is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")

        if len(audio) == 0:
            return ""

        segments, _info = self._model.transcribe(
            audio,
            beam_size=1,             # faster on CPU
            language="en",           # skip language detection for speed
            vad_filter=True,         # skip silence
            vad_parameters={"min_silence_duration_ms": 300},
        )

        parts = [seg.text.strip() for seg in segments]
        return " ".join(parts).strip()

    def transcribe_partial(
        self,
        audio: np.ndarray,
        chunk_duration_sec: float = 2.0,
    ) -> Generator[str, None, None]:
        """
        Yield incremental partial transcription results as Whisper processes
        each segment of audio.

        Parameters
        ----------
        audio             : float32 numpy array at 16 kHz
        chunk_duration_sec: minimum seconds of audio to accumulate before
                            yielding a partial result

        Yields
        ------
        Partial transcript strings.
        """
        if self._model is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")

        if len(audio) == 0:
            return

        segments, _info = self._model.transcribe(
            audio,
            beam_size=1,
            language="en",
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 300},
        )

        accumulated: list[str] = []
        for segment in segments:
            text = segment.text.strip()
            if text:
                accumulated.append(text)
                yield " ".join(accumulated)


def get_transcription_service() -> TranscriptionService:
    return TranscriptionService.get_instance()
