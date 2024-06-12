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

export class UpdateClientDTO {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ type: String, required: false })
  nom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsMongoId()
  @ApiProperty({ type: String, required: false })
  mandataire?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsMongoId()
  @ApiProperty({ type: String, required: false })
  chefDeFile?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({ required: false })
  active?: boolean;

  @IsOptional()
  @IsNotEmptyObject()
  @ValidateNested({ each: true })
  @Type(() => Options)
  @ApiProperty({ type: () => Options, required: false })
  options?: Options;
}
