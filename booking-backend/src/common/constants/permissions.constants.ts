/**
 * Permissions Constants for Booking System
 *
 * This file defines the permission matrix and role hierarchy
 * for the Role-Based Access Control (RBAC) system.
 */

export const PERMISSIONS_MATRIX = {
  // Role definitions with associated permissions
  roles: {
    USER: {
      name: "Regular User",
      description:
        "Customer who can book appointments and manage their profile",
      permissions: [
        "user:read:own",
        "user:update:own",
        "service:read",
        "booking:create",
        "booking:read:own",
        "booking:update:own",
        "booking:cancel:own",
        "timeslot:read",
      ],
    },

    ADMIN: {
      name: "System Administrator",
      description:
        "Full system access including user management and system configuration",
      permissions: [
        // User permissions
        "user:read:own",
        "user:update:own",
        "user:read:any",
        "user:update:any",
        "user:delete:any",
        "user:role:update",

        // Service permissions
        "service:read",
        "service:create",
        "service:update",
        "service:delete",
        "service:toggle",

        // Booking permissions
        "booking:create",
        "booking:read:own",
        "booking:update:own",
        "booking:cancel:own",
        "booking:read:any",
        "booking:update:any",
        "booking:cancel:any",

        // Time slot permissions
        "timeslot:read",
        "timeslot:create",
        "timeslot:update",
        "timeslot:delete",

        // System permissions
        "system:config:read",
        "system:config:update",

        // Audit permissions
        "audit:read",
      ],
    },
  },

  // Permission descriptions for documentation and UI
  permissionDescriptions: {
    // User permissions
    "user:read:own": "Read own user profile",
    "user:update:own": "Update own user profile",
    "user:read:any": "Read any user profile",
    "user:update:any": "Update any user profile",
    "user:delete:any": "Delete any user",
    "user:role:update": "Update user role",

    // Service permissions
    "service:read": "View available services",
    "service:create": "Create new service",
    "service:update": "Update existing service",
    "service:delete": "Delete service",
    "service:toggle": "Activate/deactivate service",

    // Booking permissions
    "booking:create": "Create new booking",
    "booking:read:own": "View own bookings",
    "booking:update:own": "Update own booking",
    "booking:cancel:own": "Cancel own booking",
    "booking:read:any": "View any booking",
    "booking:update:any": "Update any booking",
    "booking:cancel:any": "Cancel any booking",

    // Time slot permissions
    "timeslot:read": "View available time slots",
    "timeslot:create": "Create new time slots",
    "timeslot:update": "Update time slots",
    "timeslot:delete": "Delete time slots",

    // System permissions
    "system:config:read": "Read system configuration",
    "system:config:update": "Update system configuration",

    // Audit permissions
    "audit:read": "Read audit logs",
  },

  // Data scope permissions (require ownership check)
  dataScopePermissions: [
    "user:read:own",
    "user:update:own",
    "booking:read:own",
    "booking:update:own",
    "booking:cancel:own",
  ],

  // Permission hierarchy (higher permissions imply lower ones)
  permissionHierarchy: {
    "user:read:any": ["user:read:own"],
    "user:update:any": ["user:update:own"],
    "booking:read:any": ["booking:read:own"],
    "booking:update:any": ["booking:update:own"],
    "booking:cancel:any": ["booking:cancel:own"],
  },

  // Role hierarchy (higher roles inherit permissions of lower roles)
  roleHierarchy: {
    ADMIN: ["USER"],
  },

  // API endpoint to permission mapping (for reference)
  endpointPermissions: {
    // Auth endpoints
    "POST /v1/auth/login": [],
    "POST /v1/auth/register": [],
    "POST /v1/auth/refresh": [],
    "POST /v1/auth/logout": ["user:read:own"],

    // User endpoints
    "GET /v1/users/profile": ["user:read:own"],
    "PUT /v1/users/profile": ["user:update:own"],
    "GET /v1/users": ["user:read:any"],
    "GET /v1/users/:id": ["user:read:any"],
    "PUT /v1/users/:id": ["user:update:any"],
    "DELETE /v1/users/:id": ["user:delete:any"],
    "PATCH /v1/users/:id/role": ["user:role:update"],

    // Service endpoints
    "GET /v1/services": ["service:read"],
    "POST /v1/services": ["service:create"],
    "PUT /v1/services/:id": ["service:update"],
    "DELETE /v1/services/:id": ["service:delete"],
    "PATCH /v1/services/:id/active": ["service:toggle"],

    // Booking endpoints
    "POST /v1/bookings": ["booking:create"],
    "GET /v1/bookings": ["booking:read:own", "booking:read:any"],
    "GET /v1/bookings/:id": ["booking:read:own", "booking:read:any"],
    "PUT /v1/bookings/:id": ["booking:update:own", "booking:update:any"],
    "PATCH /v1/bookings/:id/cancel": [
      "booking:cancel:own",
      "booking:cancel:any",
    ],

    // Time slot endpoints
    "GET /v1/time-slots/available": ["timeslot:read"],
    "POST /v1/time-slots": ["timeslot:create"],
    "PUT /v1/time-slots/:id": ["timeslot:update"],
    "DELETE /v1/time-slots/:id": ["timeslot:delete"],

    // System endpoints
    "GET /v1/system/config": ["system:config:read"],
    "PUT /v1/system/config": ["system:config:update"],

    // Audit endpoints
    "GET /v1/audit/logs": ["audit:read"],
  },
};

/**
 * Helper function to check if a user has a specific permission
 */
export function hasPermission(userRole: string, permission: string): boolean {
  const roleKey = userRole as keyof typeof PERMISSIONS_MATRIX.roles;
  const rolePermissions = PERMISSIONS_MATRIX.roles[roleKey]?.permissions || [];

  // Check direct permission
  if (rolePermissions.includes(permission)) {
    return true;
  }

  // Check permission hierarchy
  const hierarchy = PERMISSIONS_MATRIX.permissionHierarchy;
  for (const [higherPermission, impliedPermissions] of Object.entries(
    hierarchy,
  )) {
    if (
      impliedPermissions.includes(permission) &&
      rolePermissions.includes(higherPermission)
    ) {
      return true;
    }
  }

  // Check role hierarchy
  const roleHierarchy = PERMISSIONS_MATRIX.roleHierarchy;
  const hierarchyKey = userRole as keyof typeof roleHierarchy;
  const inheritedRoles = roleHierarchy[hierarchyKey] || [];

  for (const inheritedRole of inheritedRoles) {
    const inheritedRoleKey =
      inheritedRole as keyof typeof PERMISSIONS_MATRIX.roles;
    const inheritedPermissions =
      PERMISSIONS_MATRIX.roles[inheritedRoleKey]?.permissions || [];
    if (inheritedPermissions.includes(permission)) {
      return true;
    }
  }

  return false;
}

/**
 * Helper function to get all permissions for a specific role
 */
export function getPermissionsForRole(role: string): string[] {
  const roleKey = role as keyof typeof PERMISSIONS_MATRIX.roles;
  const rolePermissions = PERMISSIONS_MATRIX.roles[roleKey]?.permissions || [];

  // Include inherited permissions from role hierarchy
  const roleHierarchy = PERMISSIONS_MATRIX.roleHierarchy;
  const hierarchyKey = role as keyof typeof roleHierarchy;
  const inheritedRoles = roleHierarchy[hierarchyKey] || [];

  let allPermissions: string[] = [];
  for (const inheritedRole of inheritedRoles) {
    const inheritedRoleKey =
      inheritedRole as keyof typeof PERMISSIONS_MATRIX.roles;
    const inheritedPermissions =
      PERMISSIONS_MATRIX.roles[inheritedRoleKey]?.permissions || [];
    allPermissions = [...allPermissions, ...inheritedPermissions];
  }

  // Include implied permissions from permission hierarchy
  const hierarchy = PERMISSIONS_MATRIX.permissionHierarchy;
  for (const permission of rolePermissions) {
    const permissionKey = permission as keyof typeof hierarchy;
    const impliedPermissions = hierarchy[permissionKey] || [];
    allPermissions = [...allPermissions, ...impliedPermissions];
  }

  return [...new Set([...rolePermissions, ...allPermissions])];
}

/**
 * Helper function to check if permission requires data scope validation
 */
export function requiresDataScope(permission: string): boolean {
  return PERMISSIONS_MATRIX.dataScopePermissions.includes(permission);
}

/**
 * Default permissions for new users
 */
export const DEFAULT_USER_PERMISSIONS =
  PERMISSIONS_MATRIX.roles.USER.permissions;

/**
 * Admin permissions (all permissions)
 */
export const ADMIN_PERMISSIONS = PERMISSIONS_MATRIX.roles.ADMIN.permissions;
