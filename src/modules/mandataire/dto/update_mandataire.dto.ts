import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateMandataireDTO {
  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false })
  nom?: string;

  @IsOptional()
  @IsEmail()
  @ApiProperty({ type: String, required: false })
  email?: string;
}
