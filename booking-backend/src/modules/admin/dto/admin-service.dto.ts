import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AdminServiceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ description: "Duration in minutes" })
  duration!: number;

  @ApiProperty()
  price!: number;

  @ApiProperty({ description: "Whether the service is active" })
  active!: boolean;

  @ApiPropertyOptional({ description: "Image URL (placeholder)" })
  imageUrl?: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: Date;
}

export class CreateAdminServiceDto {
  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ description: "Duration in minutes" })
  duration!: number;

  @ApiProperty()
  price!: number;

  @ApiPropertyOptional({ default: true })
  active?: boolean;

  @ApiPropertyOptional()
  imageUrl?: string;
}

export class UpdateAdminServiceDto {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ description: "Duration in minutes" })
  duration?: number;

  @ApiPropertyOptional()
  price?: number;

  @ApiPropertyOptional()
  active?: boolean;

  @ApiPropertyOptional()
  imageUrl?: string;
}

export class AdminServicesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Search by service name or description" })
  search?: string;

  @ApiPropertyOptional({ description: "Filter by active status" })
  active?: boolean;
}
