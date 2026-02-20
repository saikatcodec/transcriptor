-- AlphaNet Transcription — Database Schema
CREATE TABLE IF NOT EXISTS transcription_sessions (
    id                  VARCHAR(36)         PRIMARY KEY,
    created_at          TIMESTAMP WITH TIME ZONE
                            NOT NULL
                            DEFAULT CURRENT_TIMESTAMP,
    transcript          TEXT                NOT NULL DEFAULT '',
    transcript_preview  VARCHAR(200)         NOT NULL DEFAULT '',
    word_count          INTEGER             NOT NULL DEFAULT 0,
    duration_sec        FLOAT               NOT NULL DEFAULT 0.0
);

-- Index for fast newest-first list queries
CREATE INDEX IF NOT EXISTS ix_transcription_sessions_created_at
    ON transcription_sessions (created_at DESC);
