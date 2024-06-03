import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsBoolean,
  IsDefined,
  IsEmail,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { Perimeter } from '../chef_de_file.schema';

export class CreateChefDeFileDTO {
  @IsString()
  @Length(3, 200)
  @ApiProperty({ type: String, required: true })
  nom: string;

  @IsEmail()
  @ApiProperty({ type: String, required: true })
  email: string;

  @IsBoolean()
  @ApiProperty({ type: Boolean, required: false, default: true })
  isEmailPublic?: boolean;

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
  perimetre?: Perimeter[];
}
