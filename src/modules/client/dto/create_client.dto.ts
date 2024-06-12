import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Options } from '../client.schema';
import { Type } from 'class-transformer';

export class CreateClientDTO {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ type: String, required: true })
  nom: string;

  @IsNotEmpty()
  @IsMongoId()
  @ApiProperty({ type: String, required: true })
  mandataire: string;

  @IsOptional()
  @IsNotEmpty()
  @IsMongoId()
  @ApiProperty({ type: String, required: false })
  chefDeFile?: string;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({ required: false, default: true })
  active?: boolean;

  @IsNotEmptyObject()
  @ValidateNested({ each: true })
  @Type(() => Options)
  @ApiProperty({ type: () => Options, required: true })
  options?: Options;
}
