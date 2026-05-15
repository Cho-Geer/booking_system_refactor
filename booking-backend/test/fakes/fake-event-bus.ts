/**
 * FakeEventBus — In-memory publish/subscribe event bus.
 *
 * Replaces: NotificationsGateway (WebSocket) + EventEmitter2
 *
 * Features:
 * - Room-based pub/sub (subscribe to rooms)
 * - Event history buffer (for assertions: "was event X emitted?")
 * - Wildcard room support (broadcast)
 * - Synchronous dispatch mode
 *
 * @example
 * ```ts
 * const bus = new FakeEventBus();
 * bus.subscribe('user:123', (event) => { ... });
 * bus.publish('user:123', { type: 'booking:confirmed', data: {...} });
 * const history = bus.getHistory('user:123');
 * expect(history).toHaveLength(1);
 * ```
 */
export class FakeEventBus {
  private subscribers: Map<string, Set<(event: any) => void>> = new Map();
  private history: EventRecord[] = [];

  /**
   * Subscribe to events on a specific room.
   * Returns an unsubscribe function.
   */
  subscribe(room: string, handler: (event: any) => void): () => void {
    if (!this.subscribers.has(room)) {
      this.subscribers.set(room, new Set());
    }
    this.subscribers.get(room)!.add(handler);

    return () => {
      this.subscribers.get(room)?.delete(handler);
      if (this.subscribers.get(room)?.size === 0) {
        this.subscribers.delete(room);
      }
    };
  }

  /**
   * Publish an event to all subscribers of a specific room.
   */
  publish(room: string, event: any): void {
    const record: EventRecord = {
      room,
      event,
      timestamp: Date.now(),
    };
    this.history.push(record);

    const handlers = this.subscribers.get(room);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }
  }

  /**
   * Broadcast an event to all rooms matching a wildcard pattern.
   * Supports '*' as wildcard character.
   */
  broadcast(roomPattern: string, event: any): void {
    const regex = new RegExp("^" + roomPattern.replace(/\*/g, ".*") + "$");
    for (const [room] of this.subscribers) {
      if (regex.test(room)) {
        this.publish(room, event);
      }
    }
  }

  /**
   * Get event history for a specific room, or all history if no room specified.
   */
  getHistory(room?: string): EventRecord[] {
    if (room === undefined) {
      return [...this.history];
    }
    return this.history.filter((r) => r.room === room);
  }

  /**
   * Clear all event history.
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get the number of subscribers for a specific room, or total if no room specified.
   */
  subscriberCount(room?: string): number {
    if (room === undefined) {
      let total = 0;
      for (const handlers of this.subscribers.values()) {
        total += handlers.size;
      }
      return total;
    }
    return this.subscribers.get(room)?.size ?? 0;
  }
}

/**
 * A record of a published event, stored in the event history.
 */
export interface EventRecord {
  /** The room the event was published to */
  room: string;
  /** The event payload */
  event: any;
  /** Unix timestamp (ms) when the event was published */
  timestamp: number;
}
