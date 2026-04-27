import { ApiProperty } from "@nestjs/swagger";
import { UserType, UserStatus } from "@prisma/client";

export class ProfileResponseDto {
  @ApiProperty({ description: "User ID" })
  id: string;

  @ApiProperty({ description: "User email (masked)" })
  email: string;

  @ApiProperty({ description: "User name" })
  name: string;

  @ApiProperty({ description: "Phone number (masked)", required: false })
  phone?: string;

  @ApiProperty({ description: "User type", enum: UserType })
  userType: UserType;

  @ApiProperty({ description: "User status", enum: UserStatus })
  status: UserStatus;

  @ApiProperty({ description: "Created at" })
  createdAt: Date;

  @ApiProperty({ description: "Updated at" })
  updatedAt: Date;
}
