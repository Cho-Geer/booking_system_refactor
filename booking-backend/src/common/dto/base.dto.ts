import { IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BaseResponseDto {
  @ApiProperty({ description: "Success status" })
  success: boolean;

  @ApiPropertyOptional({ description: "Message" })
  message?: string;
}

export class PaginationDto {
  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: "Page size", default: 10 })
  @IsOptional()
  pageSize?: number = 10;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: "Data items" })
  data: T[];

  @ApiProperty({ description: "Total count" })
  total: number;

  @ApiProperty({ description: "Current page" })
  page: number;

  @ApiProperty({ description: "Page size" })
  pageSize: number;

  @ApiProperty({ description: "Total pages" })
  totalPages: number;
}
