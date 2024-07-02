import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

export class ValidateCodePinRequestDTO {
  @IsNumberString()
  @ApiProperty({ type: String, required: true })
  code: string;
}
