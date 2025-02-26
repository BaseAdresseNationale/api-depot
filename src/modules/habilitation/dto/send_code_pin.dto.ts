import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class SendCodePinRequestDTO {
  @IsEmail()
  @ApiProperty({ type: String, required: true })
  email: string;
}
