export interface SignalMessage {
  type: string;
  [key: string]: any;
}

export default class DenoP2PSignaling extends EventTarget {
  private ws: WebSocket | null = null;
  private url: string;
  private roomId: string | null = null;

  constructor(url: string) {
    super();
    this.url = url;
  }

  connect() {
    if (this.ws) return;
    this.ws = new WebSocket(this.url);
    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        this.dispatchEvent(new CustomEvent('message', { detail: data }));
      } catch {
        // ignore
      }
    };
  }

  joinRoom(room: string) {
    this.connect();
    this.roomId = room;
    this.ws?.send(JSON.stringify({ action: 'join', room }));
  }

  leaveRoom() {
    if (this.ws && this.roomId) {
      this.ws.send(JSON.stringify({ action: 'leave', room: this.roomId }));
      this.roomId = null;
    }
  }

  send(data: SignalMessage) {
    if (this.ws && this.roomId) {
      this.ws.send(JSON.stringify({ action: 'signal', room: this.roomId, data }));
    }
  }
}