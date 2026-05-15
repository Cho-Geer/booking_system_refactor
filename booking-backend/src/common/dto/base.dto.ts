import { IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BaseResponseDto {
  @ApiProperty({ description: "Success status" })
  success!: boolean;

  @ApiPropertyOptional({ description: "Message" })
  message?: string;
}

export class PaginationDto {
  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: "Page size", default: 20 })
  @IsOptional()
  limit?: number = 20;
}

export class MetaDto {
  @ApiProperty({ description: "Total count" })
  total!: number;

  @ApiProperty({ description: "Current page" })
  page!: number;

  @ApiProperty({ description: "Page size" })
  limit!: number;

  @ApiProperty({ description: "Total pages" })
  totalPages!: number;

  @ApiProperty({ description: "Has next page" })
  hasNext!: boolean;

  @ApiProperty({ description: "Has previous page" })
  hasPrev!: boolean;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: "Data items" })
  items!: T[];

  @ApiProperty({ description: "Pagination metadata" })
  meta!: MetaDto;
}
