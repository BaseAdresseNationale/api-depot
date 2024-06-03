import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsMongoId,
  IsNotEmptyObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Options } from '../client.schema';
import { Type } from 'class-transformer';

export class UpdateClientDTO {
  @IsString()
  @ApiProperty({ type: String, required: true })
  nom?: string;

  @IsMongoId()
  @ApiProperty({ type: String, required: true })
  mandataire?: string;

  @IsMongoId()
  @ApiProperty({ type: String, required: false })
  chefDeFile?: string;

  @IsBoolean()
  @ApiProperty({ required: false })
  active?: boolean;

  @IsNotEmptyObject()
  @ValidateNested({ each: true })
  @Type(() => Options)
  @ApiProperty({ type: () => Options, required: true })
  options?: Options;
}
