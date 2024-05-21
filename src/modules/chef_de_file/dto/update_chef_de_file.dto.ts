import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsBoolean,
  IsDefined,
  IsEmail,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Perimeter } from '../chef_de_file.schema';
import { Type } from 'class-transformer';

export class UpdateChefDeFileDTO {
  @IsString()
  @ApiProperty({ type: String, required: false })
  nom: string;

  @IsEmail()
  @ApiProperty({ type: String, required: false })
  email: string;

  @IsBoolean()
  @ApiProperty({ type: Boolean, required: false })
  isEmailPublic: boolean;

  @IsDefined()
  @ValidateNested({ each: true })
  @ArrayNotEmpty()
  @Type(() => Perimeter)
  @ApiProperty({
    type: () => Perimeter,
    isArray: true,
    required: true,
    nullable: false,
  })
  perimeters: Perimeter[];
}
