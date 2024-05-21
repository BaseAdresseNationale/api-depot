import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ValidateCodePinRequestDTO {
  @IsString()
  @ApiProperty({ type: String, required: true })
  code: string;
}

export class ValidateCodePinResponseDTO {
  @ApiProperty({ type: Boolean, required: true })
  validated: boolean;

  @ApiProperty({ type: String, required: false })
  error?: string;

  @ApiProperty({ type: Number, required: false })
  remainingAttempts?: number;
}
