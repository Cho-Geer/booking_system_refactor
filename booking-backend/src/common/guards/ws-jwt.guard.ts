import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";

/**
 * WebSocket JWT Authentication Guard
 *
 * This guard validates JWT tokens for WebSocket connections.
 * Unlike HTTP requests, WebSocket connections pass tokens via:
 * - client.handshake.auth.token
 * - client.handshake.headers.authorization (Bearer <token>)
 *
 * ARCHITECTURE NOTE: @UseGuards(WsJwtGuard) decorator is NOT used on
 * WebSocket gateways (e.g., NotificationsGateway). NestJS AuthGuard's
 * canActivate() expects an HTTP-centric ExecutionContext (with request/response).
 * For WebSocket, we use WsJwtGuard's validateToken() method directly,
 * which provides a clean, testable authentication abstraction.
 * See: https://docs.nestjs.com/websockets/guards (WebSocket guards require
 * custom ExecutionContext handling, making @UseGuards less practical here)
 */
@Injectable()
export class WsJwtGuard extends AuthGuard("jwt") {
  constructor(private readonly jwtService: JwtService) {
    super();
  }

  /**
   * Extract JWT token from WebSocket handshake
   */
  static extractToken(client: Socket): string | null {
    // Try auth.token first (Socket.IO recommended)
    const tokenFromAuth = client.handshake.auth?.token;
    if (tokenFromAuth) {
      return tokenFromAuth.replace("Bearer ", "");
    }

    // Fallback to Authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader) {
      return authHeader.replace("Bearer ", "");
    }

    return null;
  }

  /**
   * Validate JWT token and extract user ID
   * @returns Decoded payload with userId
   */
  async validateToken(
    token: string,
  ): Promise<{ userId: string; roles: string[] }> {
    try {
      const decoded = this.jwtService.verify(token);
      return {
        userId: decoded.sub || decoded.id,
        roles: decoded.roles || [],
      };
    } catch (_error) {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
