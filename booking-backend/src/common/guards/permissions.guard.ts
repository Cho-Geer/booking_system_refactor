import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_MATRIX } from "../constants/permissions.constants";
import { Request } from "express";

interface PermissionsUser {
  id: string;
  role: string;
  [key: string]: unknown;
}

interface PermissionsRequest extends Request {
  user?: PermissionsUser;
}

/**
 * Permissions Guard - Permission-Based Access Control
 *
 * This guard checks if the authenticated user has the required permissions
 * to perform an action. It works with the @Permissions() decorator.
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @Permissions('booking:create')
 * @Post('bookings')
 * createBooking() {}
 * ```
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Determine if the request is authorized based on user permissions
   */
  canActivate(context: ExecutionContext): boolean {
    // Get required permissions from the handler or class metadata
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      "permissions",
      [context.getHandler(), context.getClass()],
    );

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    // Get user permissions based on role
    const userPermissions = this.getUserPermissions(user.role);

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      this.logAccessDenied(user, requiredPermissions, userPermissions, context);
      throw new ForbiddenException(
        `Access denied. Required permissions: ${requiredPermissions.join(", ")}`,
      );
    }

    // Check data scope if applicable (e.g., user can only access their own data)
    if (this.requiresDataScopeCheck(requiredPermissions)) {
      const hasDataAccess = this.checkDataScopeAccess(
        user,
        request,
        requiredPermissions,
      );
      if (!hasDataAccess) {
        throw new ForbiddenException("Access denied to this resource");
      }
    }

    return true;
  }

  /**
   * Get user permissions based on role
   */
  private getUserPermissions(role: string): string[] {
    // Use permission matrix from constants
    const roleKey = role as keyof typeof PERMISSIONS_MATRIX.roles;
    const rolePermissions =
      PERMISSIONS_MATRIX.roles[roleKey]?.permissions || [];

    // Include inherited permissions from role hierarchy
    const inheritedPermissions = this.getInheritedPermissions(role);

    return [...new Set([...rolePermissions, ...inheritedPermissions])];
  }

  /**
   * Get inherited permissions based on role hierarchy
   */
  private getInheritedPermissions(role: string): string[] {
    const hierarchy = PERMISSIONS_MATRIX.roleHierarchy || {};
    const roleKey = role as keyof typeof hierarchy;
    const inheritedRoles = hierarchy[roleKey] || [];

    let allPermissions: string[] = [];

    for (const inheritedRole of inheritedRoles) {
      const inheritedRoleKey =
        inheritedRole as keyof typeof PERMISSIONS_MATRIX.roles;
      const rolePerms =
        PERMISSIONS_MATRIX.roles[inheritedRoleKey]?.permissions || [];
      allPermissions = [...allPermissions, ...rolePerms];

      // Recursively get permissions from inherited roles
      const deeperInherited = this.getInheritedPermissions(inheritedRole);
      allPermissions = [...allPermissions, ...deeperInherited];
    }

    return [...new Set(allPermissions)];
  }

  /**
   * Check if any of the required permissions need data scope validation
   */
  private requiresDataScopeCheck(requiredPermissions: string[]): boolean {
    const dataScopePermissions = PERMISSIONS_MATRIX.dataScopePermissions || [];

    return requiredPermissions.some((permission) =>
      dataScopePermissions.includes(permission),
    );
  }

  /**
   * Check data scope access (e.g., user can only access their own resources)
   */
  private checkDataScopeAccess(
    user: PermissionsUser,
    request: PermissionsRequest,
    requiredPermissions: string[],
  ): boolean {
    const resourceId = this.extractResourceId(request);

    // Check if user is accessing their own data
    if (this.isOwnResourceAccess(user, request, resourceId)) {
      return true;
    }

    // Check if user has "any" permission (can access any resource)
    const hasAnyPermission = requiredPermissions.some((permission) =>
      permission.endsWith(":any"),
    );

    if (hasAnyPermission) {
      return true;
    }

    return false;
  }

  /**
   * Extract resource ID from request
   */
  private extractResourceId(request: PermissionsRequest): string | null {
    // Try to get resource ID from route parameters
    if (request.params && request.params.id) {
      return String(request.params.id);
    }

    // Try to get resource ID from request body
    if (request.body && request.body.id) {
      return String(request.body.id);
    }

    // Try to get user ID from query parameters for user-specific resources
    if (request.query && request.query.userId) {
      const userId = request.query.userId;
      return typeof userId === "string" ? userId : null;
    }

    return null;
  }

  /**
   * Check if user is accessing their own resource
   */
  private isOwnResourceAccess(
    user: PermissionsUser,
    request: PermissionsRequest,
    resourceId: string | null,
  ): boolean {
    if (!resourceId) {
      return false;
    }

    // Check if resource ID matches user ID (for user resources)
    if (resourceId === user.id) {
      return true;
    }

    // Check if request is for user's own profile
    if (request.url.includes("/profile") && request.method === "GET") {
      return true;
    }

    // For other resources, need to check ownership in database
    // This would be implemented in the service layer
    return false;
  }

  /**
   * Log access denied attempts for security monitoring
   */
  private logAccessDenied(
    user: PermissionsUser,
    requiredPermissions: string[],
    userPermissions: string[],
    context: ExecutionContext,
  ): void {
    const request = context.switchToHttp().getRequest<PermissionsRequest>();
    const missingPermissions = requiredPermissions.filter(
      (permission) => !userPermissions.includes(permission),
    );

    const logData = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      userRole: user.role,
      requiredPermissions,
      userPermissions,
      missingPermissions,
      endpoint: `${request.method} ${request.url}`,
      ipAddress: request.ip,
      userAgent: request.get("user-agent"),
    };

    // In production, this would log to a security monitoring system
    console.warn("Access denied - insufficient permissions:", logData);
  }
}
