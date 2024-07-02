import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { Perimeter } from '../chef_de_file.schema';

export class UpdateChefDeFileDTO {
  @IsOptional()
  @IsString()
  @Length(3, 200)
  @ApiProperty({ type: String, required: false })
  nom?: string;

  @IsOptional()
  @IsEmail()
  @ApiProperty({ type: String, required: false })
  email?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean, required: false })
  isEmailPublic?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Perimeter)
  @ApiProperty({
    type: () => Perimeter,
    isArray: true,
    required: true,
    nullable: false,
  })
  perimetre?: Perimeter[];
}
