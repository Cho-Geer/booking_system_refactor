import { SetMetadata } from '@nestjs/common';

/**
 * Roles Decorator
 *
 * This decorator specifies which roles are required to access a route.
 * It works with the RolesGuard to enforce role-based access control.
 *
 * @param roles - The roles required to access the route
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('ADMIN')
 * @Get('admin-data')
 * getAdminData() {}
 * ```
 *
 * @example
 * ```typescript
 * // Multiple roles (user can have any of the specified roles)
 * @Roles('USER', 'ADMIN')
 * @Get('user-data')
 * getUserData() {}
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

/**
 * AdminOnly Decorator (convenience decorator)
 *
 * Convenience decorator for routes that require ADMIN role.
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @AdminOnly()
 * @Get('admin-only')
 * getAdminOnlyData() {}
 * ```
 */
export const AdminOnly = () => Roles('ADMIN');

/**
 * CustomerOnly Decorator (convenience decorator)
 *
 * Convenience decorator for routes that require CUSTOMER role.
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @CustomerOnly()
 * @Get('customer-only')
 * getCustomerOnlyData() {}
 * ```
 */
export const CustomerOnly = () => Roles('CUSTOMER');

/**
 * AuthenticatedOnly Decorator (convenience decorator)
 *
 * Convenience decorator for routes that require any authenticated user.
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @AuthenticatedOnly()
 * @Get('authenticated-data')
 * getAuthenticatedData() {}
 * ```
 */
export const AuthenticatedOnly = () => Roles('CUSTOMER', 'ADMIN');
