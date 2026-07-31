import { EventBus } from './EventBus';

export class RuntimeClient {
  private baseUrl: string;
  private wsUrl: string;
  private bus: EventBus;
  private socket: WebSocket | null = null;
  private reconnectTimer: any = null;

  constructor(baseUrl: string, bus: EventBus) {
    this.baseUrl = baseUrl;
    this.wsUrl = baseUrl.replace(/^http/, 'ws');
    this.bus = bus;
  }

  connect() {
    try {
      this.socket = new WebSocket(`${this.wsUrl}/events`);
      
      this.socket.onopen = () => {
        console.log('Connected to AI Runtime');
        this.bus.emit('RuntimeConnected');
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      };

      this.socket.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          // Broadcast to frontend EventBus
          if (data.type) {
            this.bus.emit(data.type, data.payload);
          }
        } catch (e) {
          console.warn('Failed to parse incoming WS message:', e);
        }
      };

      this.socket.onclose = () => {
        this.bus.emit('RuntimeDisconnected');
        this.scheduleReconnect();
      };
      
      this.socket.onerror = (err) => {
        console.error('WebSocket Error:', err);
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
  }

  async fetchState(endpoint: string) {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`REST fallback failed for ${endpoint}:`, err);
      return null;
    }
  }
}
