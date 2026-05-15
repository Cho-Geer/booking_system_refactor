import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UserSummaryDto {
  @ApiProperty({ description: "User ID" })
  id!: string;

  @ApiProperty({ description: "User name" })
  name!: string;

  @ApiPropertyOptional({ description: "User email" })
  email?: string;

  @ApiPropertyOptional({ description: "User phone" })
  phone?: string;

  @ApiProperty({ description: "User role" })
  role!: string;

  @ApiProperty({ description: "Created at timestamp" })
  createdAt!: Date;
}

export class LoginResponseDto {
  @ApiProperty({ description: "JWT access token" })
  access_token!: string;

  @ApiProperty({ description: "JWT refresh token" })
  refresh_token!: string;

  @ApiProperty({ description: "Token expiration time in seconds" })
  expires_in!: number;

  @ApiProperty({ description: "Token type", example: "Bearer" })
  token_type!: string;

  @ApiProperty({
    description: "Authenticated user summary",
    type: UserSummaryDto,
  })
  user!: UserSummaryDto;
}

// Internal DTO for token generation (without user field)
export class TokenDto {
  @ApiProperty({ description: "JWT access token" })
  access_token!: string;

  @ApiProperty({ description: "JWT refresh token" })
  refresh_token!: string;

  @ApiProperty({ description: "Token expiration time in seconds" })
  expires_in!: number;

  @ApiProperty({ description: "Token type", example: "Bearer" })
  token_type!: string;
}

export class RegisterResponseDto {
  @ApiProperty({ description: "Registered user summary", type: UserSummaryDto })
  user!: UserSummaryDto;
}

export class ErrorResponseDto {
  @ApiProperty({ description: "Error type" })
  error!: string;

  @ApiPropertyOptional({ description: "Error message" })
  message?: string;

  @ApiProperty({ description: "HTTP status code" })
  statusCode!: number;

  @ApiProperty({ description: "Error timestamp in ISO format" })
  timestamp!: string;

  @ApiPropertyOptional({ description: "Request path that caused the error" })
  path?: string;
}
