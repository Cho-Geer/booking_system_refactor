import { CreateAdminServiceDto, UpdateAdminServiceDto, AdminServiceDto } from "../dto/admin-service.dto";

interface PrismaService {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  pricePerMinute?: number | null;
  isActive: boolean;
  createdAt: Date;
  imageUrl?: string | null;
}

export function toAdminServiceDto(service: PrismaService): AdminServiceDto {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    duration: service.durationMinutes,
    price: service.price,
    pricePerMinute: service.pricePerMinute ?? undefined,
    active: service.isActive,
    imageUrl: service.imageUrl ?? undefined,
    createdAt: service.createdAt,
  };
}

export function fromCreateAdminServiceDto(dto: CreateAdminServiceDto) {
  return {
    name: dto.name,
    description: dto.description,
    durationMinutes: dto.duration,
    price: dto.price,
    pricePerMinute: dto.pricePerMinute,
    isActive: dto.active ?? true,
    imageUrl: dto.imageUrl,
  };
}

export function fromUpdateAdminServiceDto(dto: UpdateAdminServiceDto) {
  const update: Record<string, unknown> = {};
  if (dto.name !== undefined) update.name = dto.name;
  if (dto.description !== undefined) update.description = dto.description;
  if (dto.duration !== undefined) update.durationMinutes = dto.duration;
  if (dto.price !== undefined) update.price = dto.price;
  if (dto.pricePerMinute !== undefined) update.pricePerMinute = dto.pricePerMinute;
  if (dto.active !== undefined) update.isActive = dto.active;
  if (dto.imageUrl !== undefined) update.imageUrl = dto.imageUrl;
  return update;
}
