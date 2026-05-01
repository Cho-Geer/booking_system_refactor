import { Injectable } from '@angular/core';

/**
 * Centralized route resolution service.
 *
 * Provides a single source of truth for post-login route mapping
 * based on user roles. Used across login, register, and guest guard
 * to replace scattered routing logic.
 */
@Injectable({ providedIn: 'root' })
export class RouteResolver {
  /** Role-to-route mapping for post-login redirects */
  static readonly ROLE_HOME: Record<string, string> = {
    ADMIN: '/admin/dashboard',
    SUPER_ADMIN: '/admin/dashboard',
    CUSTOMER: '/booking',
  };

  /** Default route when role is unknown or not provided */
  private static readonly DEFAULT_ROUTE = '/booking';

  /**
   * Returns the post-login home route for a given user role.
   *
   * @param role - The user's role string (may be undefined, null, or empty)
   * @returns The mapped route for known roles, or '/booking' as fallback
   */
  static getPostLoginRoute(role?: string): string {
    if (!role) {
      return this.DEFAULT_ROUTE;
    }
    return this.ROLE_HOME[role] || this.DEFAULT_ROUTE;
  }
}
