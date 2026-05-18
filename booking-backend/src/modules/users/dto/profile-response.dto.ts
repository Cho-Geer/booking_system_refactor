import { ApiProperty } from '@nestjs/swagger';
import { SystemRole, UserStatus } from '@prisma/client';

export class ProfileResponseDto {
  @ApiProperty({ description: 'User ID' })
  id!: string;

  @ApiProperty({ description: 'User email (masked)' })
  email!: string;

  @ApiProperty({ description: 'User name' })
  name!: string;

  @ApiProperty({ description: 'Phone number (masked)', required: false })
  phone?: string;

  @ApiProperty({ description: 'User role', enum: SystemRole })
  role!: SystemRole;

  @ApiProperty({ description: 'User status', enum: UserStatus })
  status!: UserStatus;

  @ApiProperty({ description: 'Preferred timezone', required: false })
  preferredTimezone?: string;

  @ApiProperty({ description: 'Created at' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt!: Date;
}
