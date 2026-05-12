import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

interface RequestUser {
  id: string;
  role: string;
  roles?: string[];
  [key: string]: unknown;
}

/**
 * Roles Guard - Role-Based Access Control
 *
 * This guard checks if the authenticated user has the required roles
 * to access a resource. It works with the @Roles() decorator.
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('ADMIN')
 * @Get('admin-only')
 * getAdminData() {}
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Determine if the request is authorized based on user roles
   */
  canActivate(context: ExecutionContext): boolean {
    // Get required roles from the handler or class metadata
    const requiredRoles = this.reflector.getAllAndOverride<string[]>("roles", [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    // Check if user has at least one of the required roles
    // Prefer roles array over role when available
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      this.logAccessDenied(user, requiredRoles, context);
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }

  /**
   * Log access denied attempts for security monitoring
   */
  private logAccessDenied(
    user: RequestUser,
    requiredRoles: string[],
    context: ExecutionContext,
  ): void {
    const request = context.switchToHttp().getRequest();
    const logData = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      userRole: user.role,
      requiredRoles,
      endpoint: `${request.method} ${request.url}`,
      ipAddress: request.ip,
      userAgent: request.get("user-agent"),
    };

    // In production, this would log to a security monitoring system
    console.warn("Access denied - insufficient role:", logData);
  }

  /**
   * Get hierarchical role precedence (optional)
   *
   * This can be used to define role hierarchies where higher roles
   * automatically have permissions of lower roles.
   */
  private getRoleHierarchy(): Map<string, string[]> {
    // Define role hierarchy (higher roles inherit lower role permissions)
    return new Map([
      ["ADMIN", ["CUSTOMER", "ADMIN"]],
      ["CUSTOMER", ["CUSTOMER"]],
      ["SUPER_ADMIN", ["CUSTOMER", "ADMIN", "SUPER_ADMIN"]],
    ]);
  }

  /**
   * Check if user role has hierarchical access to required role
   */
  private hasHierarchicalAccess(
    userRole: string,
    requiredRole: string,
  ): boolean {
    const hierarchy = this.getRoleHierarchy();
    const userInheritedRoles = hierarchy.get(userRole) || [userRole];

    return userInheritedRoles.includes(requiredRole);
  }
}
