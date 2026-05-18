import { CreateAdminUserDto, UpdateAdminUserDto, AdminUserDto } from '../dto/admin-user.dto';

interface PrismaUser {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  status: string;
  createdAt: Date;
}

export function toAdminUserDto(user: PrismaUser): AdminUserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

export function fromCreateAdminUserDto(dto: CreateAdminUserDto) {
  const data: Record<string, unknown> = {
    name: dto.name,
    email: dto.email,
    phone: dto.phone,
    role: dto.role,
  };
  if (dto.password !== undefined) {
    data.password = dto.password;
  }
  return data;
}

export function fromUpdateAdminUserDto(dto: UpdateAdminUserDto) {
  const update: Record<string, unknown> = {};
  if (dto.name !== undefined) update.name = dto.name;
  if (dto.role !== undefined) update.role = dto.role;
  if (dto.status !== undefined) update.status = dto.status;
  return update;
}
