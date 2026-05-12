import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class UpdateTimezoneDto {
  @ApiProperty({ description: "IANA timezone string (e.g. Asia/Shanghai)" })
  @IsString()
  @IsNotEmpty()
  timezone!: string;
}
