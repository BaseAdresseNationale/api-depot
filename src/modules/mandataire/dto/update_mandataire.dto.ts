import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class UpdateMandataireDTO {
  @IsString()
  @ApiProperty({ type: String, required: false })
  nom: string;

  @IsEmail()
  @ApiProperty({ type: String, required: false })
  email: string;
}
