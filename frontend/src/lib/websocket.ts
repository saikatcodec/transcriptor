import type { WSIncomingMessage } from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

type MessageHandler = (msg: WSIncomingMessage) => void;
type ErrorHandler = (err: Event) => void;
type CloseHandler = () => void;

export class TranscriptionSocket {
  private socket: WebSocket | null = null;
  private onMessage: MessageHandler;
  private onError: ErrorHandler;
  private onClose: CloseHandler;

  constructor(handlers: {
    onMessage: MessageHandler;
    onError: ErrorHandler;
    onClose: CloseHandler;
  }) {
    this.onMessage = handlers.onMessage;
    this.onError = handlers.onError;
    this.onClose = handlers.onClose;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(`${WS_URL}/ws/transcribe`);

      this.socket.onopen = () => resolve();

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as WSIncomingMessage;
          this.onMessage(data);
        } catch {
          console.error("Failed to parse WS message", event.data);
        }
      };

      this.socket.onerror = (err) => {
        this.onError(err);
        reject(err);
      };

      this.socket.onclose = () => this.onClose();
    });
  }

  sendAudioChunk(base64Audio: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "audio_chunk", audio: base64Audio }));
    }
  }

  endStream(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "end_stream" }));
    }
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}
