import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class UpdateTimezoneDto {
  @ApiProperty({ description: 'IANA timezone string (e.g. Asia/Shanghai)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z]+\/[A-Za-z_\/]+$/)
  timezone!: string;
}
