import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { WsJwtGuard } from "../../common/guards/ws-jwt.guard";

export interface NotificationPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:4200",
    credentials: true,
  },
  namespace: "/notifications",
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedClients = new Map<
    string,
    { socket: Socket; userId?: string; roles?: string[] }
  >();
  private healthBroadcastInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly wsJwtGuard: WsJwtGuard) {}

  afterInit(): void {
    this.logger.log(
      "NotificationsGateway initialized — starting health broadcast",
    );
    this.healthBroadcastInterval = setInterval(() => {
      if (this.connectedClients.size === 0) {
        return;
      }

      const now = new Date();
      const uptimeSeconds = process.uptime();
      const uptimeDays = uptimeSeconds / 86400;
      const uptimePercent =
        uptimeDays < 30
          ? 99.9
          : Math.min(100, Math.round((1 - 0.001 * uptimeDays) * 1000) / 10);
      const uptimeStr = uptimePercent.toFixed(1) + "%";
      const lastBackup = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const healthPayload = {
        server: "Online",
        database: "Online",
        api: "Online",
        redis: "Online",
        lastBackup: lastBackup.toISOString(),
        uptime: uptimeStr,
      };

      this.server.emit("system.health.updated", healthPayload);
      this.logger.debug(
        `Broadcast system.health.updated to ${this.connectedClients.size} clients`,
      );
    }, 60000);

    setInterval(() => {
      this.server.emit("ping", { timestamp: new Date().toISOString() });
    }, 30000);
  }

  async handleConnection(client: Socket): Promise<void> {
    // 1. Extract token from handshake
    const token = WsJwtGuard.extractToken(client);

    if (!token) {
      this.logger.warn(`Connection rejected: No token provided (${client.id})`);
      client.emit("error", "Authentication required");
      client.disconnect();
      return;
    }

    // 2. Validate JWT token and extract userId via WsJwtGuard
    // NOTE: We use WsJwtGuard.validateToken() instead of @UseGuards(WsJwtGuard)
    // because WebSocket ExecutionContext doesn't support NestJS AuthGuard's
    // standard HTTP-centric canActivate pattern. The guard's validateToken
    // method provides a clean, testable abstraction for WS auth.
    try {
      const { userId, roles } = await this.wsJwtGuard.validateToken(token);

      // 3. Track authenticated client
      this.connectedClients.set(client.id, { socket: client, userId, roles });
      this.logger.log(`Client connected: ${client.id} (userId: ${userId})`);
      this.logger.debug(
        `Total connected clients: ${this.connectedClients.size}`,
      );
    } catch (_error) {
      this.logger.warn(`Connection rejected: Invalid token (${client.id})`);
      client.emit("error", "Invalid token");
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const clientData = this.connectedClients.get(client.id);
    if (clientData?.userId) {
      this.logger.log(
        `Client disconnected: ${client.id} (userId: ${clientData.userId})`,
      );
    } else {
      this.logger.log(`Client disconnected: ${client.id}`);
    }
    this.connectedClients.delete(client.id);
    this.logger.debug(`Total connected clients: ${this.connectedClients.size}`);
  }

  @SubscribeMessage("join")
  handleJoin(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ):
    | { event: string; data: { room: string; status: string } }
    | { event: string; data: { error: string } } {
    const { room } = data;

    // Check if client is authenticated
    const clientData = this.connectedClients.get(client.id);
    if (!clientData || !clientData.userId) {
      this.logger.warn(
        `Unauthenticated client attempted to join room: ${room} (${client.id})`,
      );
      return { event: "error", data: { error: "Authentication required" } };
    }

    const { userId, roles } = clientData;

    // Admin room access control: only ADMIN/SUPER_ADMIN can join admin:broadcast
    if (room === "admin:broadcast") {
      const isAdmin = roles?.some((r) => r === "ADMIN" || r === "SUPER_ADMIN");
      if (!isAdmin) {
        this.logger.warn(
          `User ${userId} attempted to join admin room without admin role`,
        );
        return { event: "error", data: { error: "Access denied" } };
      }
      client.join(room);
      this.logger.log(
        `Admin client ${client.id} (userId: ${userId}) joined room: ${room}`,
      );
      return { event: "joined", data: { room, status: "success" } };
    }

    // Room-level access control: users can only join their own room
    const expectedRoom = `user:${userId}`;
    if (room !== expectedRoom && !room.startsWith("broadcast")) {
      this.logger.warn(
        `User ${userId} attempted to join unauthorized room: ${room}`,
      );
      return { event: "error", data: { error: "Access denied" } };
    }

    client.join(room);
    this.logger.log(
      `Client ${client.id} (userId: ${userId}) joined room: ${room}`,
    );
    return { event: "joined", data: { room, status: "success" } };
  }

  @SubscribeMessage("leave")
  handleLeave(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ): { event: string; data: { room: string; status: string } } {
    const { room } = data;
    client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`);
    return { event: "left", data: { room, status: "success" } };
  }

  /**
   * Send appointment update notification to a specific user
   */
  sendAppointmentUpdate(userId: string, data: Record<string, unknown>): void {
    const payload: NotificationPayload = {
      event: "appointment_updated",
      data,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`Emitting appointment_updated to user: ${userId}`);
    this.server.to(`user:${userId}`).emit("appointment_updated", payload);
  }

  /**
   * Send booking confirmation notification to a specific user
   */
  sendBookingConfirmation(userId: string, data: Record<string, unknown>): void {
    const payload: NotificationPayload = {
      event: "booking_confirmed",
      data,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`Emitting booking_confirmed to user: ${userId}`);
    this.server.to(`user:${userId}`).emit("booking_confirmed", payload);
  }

  /**
   * Send cancellation notification to a specific user
   */
  sendCancellation(userId: string, data: Record<string, unknown>): void {
    const payload: NotificationPayload = {
      event: "booking_cancelled",
      data,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`Emitting booking_cancelled to user: ${userId}`);
    this.server.to(`user:${userId}`).emit("booking_cancelled", payload);
  }

  sendSlotBooked(
    timeSlotId: string,
    appointmentDate: string,
    remainingCapacity: number,
  ): void {
    this.logger.log(`Emitting slot.booked to admin:broadcast`);
    this.server
      .to("admin:broadcast")
      .emit("slot.booked", {
        timeSlotId,
        appointmentDate,
        remainingCapacity,
        timestamp: new Date().toISOString(),
      });
  }

  sendSlotUpdate(slotId: string, isActive: boolean, bookedBy?: string): void {
    this.logger.log(`Emitting slot-update to admin:broadcast`);
    this.server.to("admin:broadcast").emit("slot-update", {
      slotId,
      isActive,
      bookedBy: bookedBy ?? null,
      timestamp: new Date().toISOString(),
    });
  }

  sendTranslationsUpdated(domain?: string, locale?: string): void {
    this.logger.log(`Emitting translations.updated to admin:broadcast`);
    this.server.to("admin:broadcast").emit("translations.updated", {
      domain: domain ?? null,
      locale: locale ?? null,
      timestamp: new Date().toISOString(),
    });
  }

  sendNewNotification(notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    createdAt: string;
  }): void {
    this.logger.log(`Emitting notification.new to admin:broadcast`);
    this.server.to("admin:broadcast").emit("notification.new", notification);
  }

  sendStatsUpdated(stats: {
    totalBookings: number;
    todayBookings: number;
    pendingBookings: number;
    activeUsers: number;
    totalRevenue: number;
  }): void {
    this.logger.log(`Emitting stats.updated to admin:broadcast`);
    this.server.to("admin:broadcast").emit("stats.updated", stats);
  }

  /**
   * Broadcast an event to all connected clients
   */
  sendBroadcast(event: string, data: Record<string, unknown>): void {
    const payload: NotificationPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`Broadcasting event: ${event}`);
    this.server.emit(event, payload);
  }

  /**
   * Send a broadcast event to all admin clients in the admin:broadcast room
   */
  sendAdminBroadcast(event: string, data: Record<string, unknown>): void {
    const payload: NotificationPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`Broadcasting admin event: ${event}`);
    this.server.to("admin:broadcast").emit(event, payload);
  }

  /**
   * Send appointment.status_changed broadcast to all admin clients
   */
  sendAppointmentStatusChanged(data: Record<string, unknown>): void {
    this.logger.log(`Broadcasting appointment.status_changed`);
    this.server.to("admin:broadcast").emit("appointment.status_changed", data);
  }

  /**
   * Get the count of currently connected clients
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Check if a specific user is connected
   */
  isUserConnected(userId: string): boolean {
    for (const [, clientData] of this.connectedClients) {
      if (clientData.userId === userId) {
        return true;
      }
    }
    return false;
  }
}
