/**
 * User DTOs
 * 与 backend-api 契约保持一致
 * @see contract.yaml -> api.auth / api.users
 */

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  status?: string;
  preferredTimezone?: string;
  createdAt?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

export interface UpdateProfileResponse {
  user: User;
}
