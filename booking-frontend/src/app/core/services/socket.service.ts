import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Socket reconnection delay in milliseconds */
const SOCKET_RECONNECT_DELAY_MS = 1000;
/** Maximum socket reconnection attempts */
const SOCKET_MAX_RECONNECT_ATTEMPTS = 5;

export interface SlotUpdateEvent {
  slotId: string;
  isActive: boolean;
  bookedBy?: string;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket;
  private connected = false;

  constructor() {
    this.socket = io(environment.socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: SOCKET_RECONNECT_DELAY_MS,
      reconnectionAttempts: SOCKET_MAX_RECONNECT_ATTEMPTS,
    });

    this.socket.on('connect', () => {
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
    });
  }

  connect(): void {
    if (!this.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.connected) {
      this.socket.disconnect();
    }
  }

  subscribeToSlotUpdates(): Observable<SlotUpdateEvent> {
    return new Observable<SlotUpdateEvent>((observer) => {
      this.connect();

      this.socket.on('slot-update', (data: SlotUpdateEvent) => {
        observer.next(data);
      });

      return () => {
        this.socket.off('slot-update');
      };
    });
  }

  joinRoom(room: string): void {
    this.socket.emit('join-room', room);
  }

  leaveRoom(room: string): void {
    this.socket.emit('leave-room', room);
  }

  isConnected(): boolean {
    return this.connected;
  }
}
