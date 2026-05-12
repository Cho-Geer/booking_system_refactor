import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../stores/auth/auth.store';

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

export interface SystemHealthEvent {
  server: string;
  database: string;
  api: string;
  redis: string;
  lastBackup: string;
  uptime: string;
}

export interface AppointmentStatusEvent {
  appointmentId: string;
  status: string;
  previousStatus: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket;
  private connected = false;
  private readonly authStore = inject(AuthStore);

  constructor() {
    this.socket = io(`${environment.socketUrl}/notifications`, {
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
      const token = this.authStore.token();
      if (token) {
        this.socket.auth = { token };
      }
      this.socket.connect();
    }

    this.socket.on('ping', () => {
      this.socket.emit('pong');
    });
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

  subscribeToSystemHealthUpdates(): Observable<SystemHealthEvent> {
    return new Observable<SystemHealthEvent>((observer) => {
      this.connect();

      this.socket.on('system.health.updated', (data: SystemHealthEvent) => {
        observer.next(data);
      });

      return () => {
        this.socket.off('system.health.updated');
      };
    });
  }

  subscribeToAppointmentStatusChanges(): Observable<AppointmentStatusEvent> {
    return new Observable<AppointmentStatusEvent>((observer) => {
      this.connect();

      this.socket.on('appointment.status_changed', (data: AppointmentStatusEvent) => {
        observer.next(data);
      });

      return () => {
        this.socket.off('appointment.status_changed');
      };
    });
  }

  subscribeToSlotBooked(
    callback: (data: {
      timeSlotId: string;
      appointmentDate: string;
      remainingCapacity: number;
      timestamp: string;
    }) => void,
  ): void {
    this.socket.on('slot.booked', callback);
  }

  subscribeToNewNotification(
    callback: (data: {
      id: string;
      type: string;
      title: string;
      body: string;
      createdAt: string;
    }) => void,
  ): void {
    this.socket.on('notification.new', callback);
  }

  subscribeToStatsUpdated(
    callback: (data: {
      totalBookings: number;
      todayBookings: number;
      pendingBookings: number;
      activeUsers: number;
      totalRevenue: number;
    }) => void,
  ): void {
    this.socket.on('stats.updated', callback);
  }

  joinAdminRoom(): void {
    this.socket.emit('join', { room: 'admin:broadcast' });
  }

  joinRoom(room: string): void {
    this.socket.emit('join', { room });
  }

  leaveRoom(room: string): void {
    this.socket.emit('leave', { room });
  }

  isConnected(): boolean {
    return this.connected;
  }
}
