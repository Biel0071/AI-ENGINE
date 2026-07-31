type EventHandler = (data?: any) => void;

export class EventBus {
  private listeners: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  off(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) return;
    this.listeners.set(
      event,
      this.listeners.get(event)!.filter(h => h !== handler)
    );
  }

  emit(event: string, data?: any) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event)!.forEach(handler => {
      try {
        handler(data);
      } catch (err) {
        console.error(`Error in event handler for ${event}:`, err);
      }
    });
  }
}
