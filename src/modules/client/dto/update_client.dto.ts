import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsMongoId, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateClientDTO {
  @IsString()
  @ApiProperty({ type: String, required: false })
  nom: string;

  @IsMongoId()
  @ApiProperty({ type: String, required: false })
  mandataire: Types.ObjectId;

  @IsMongoId()
  @ApiProperty({ type: String, required: false })
  chefDeFile: Types.ObjectId;

  @IsBoolean()
  @ApiProperty({ required: false })
  active?: boolean;

  @IsBoolean()
  @ApiProperty({ required: false })
  relaxMode?: boolean;
}
