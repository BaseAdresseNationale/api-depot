import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class CreateMandataireDTO {
  @IsString()
  @ApiProperty({ type: String, required: true })
  nom: string;

  @IsEmail()
  @ApiProperty({ type: String, required: true })
  email: string;
}
