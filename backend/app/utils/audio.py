import base64
import io

import numpy as np


def pcm_bytes_to_float32(raw_bytes: bytes, sample_rate: int = 16000) -> np.ndarray:
    """
    Convert raw 16-bit signed PCM bytes to a normalised float32 numpy array
    that faster-whisper expects.

    Parameters
    ----------
    raw_bytes   : concatenated raw Int16 PCM bytes (little-endian)
    sample_rate : expected sample rate (must match what the client sends)

    Returns
    -------
    np.ndarray of shape (N,) with dtype float32, values in [-1.0, 1.0]
    """
    audio_int16 = np.frombuffer(raw_bytes, dtype=np.int16)
    audio_float32 = audio_int16.astype(np.float32) / 32768.0
    return audio_float32


def base64_to_bytes(b64_string: str) -> bytes:
    """Decode a base64 string (with or without padding) to raw bytes."""
    # Add padding if necessary
    padding = 4 - len(b64_string) % 4
    if padding != 4:
        b64_string += "=" * padding
    return base64.b64decode(b64_string)


def count_words(text: str) -> int:
    """Return the number of whitespace-delimited words in a string."""
    return len(text.split()) if text.strip() else 0


def build_preview(text: str, max_chars: int = 200) -> str:
    """Return a truncated preview of a transcript for list views."""
    text = text.strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rsplit(" ", 1)[0] + "…"
