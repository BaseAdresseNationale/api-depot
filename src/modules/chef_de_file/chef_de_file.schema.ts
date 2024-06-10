import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsString } from 'class-validator';
import { SchemaTypes } from 'mongoose';

import { DateEntity } from '@/lib/class/schemas/dates.schema';

export enum TypePerimeterEnum {
  COMMUNE = 'commune',
  DEPARTEMENT = 'departement',
  EPCI = 'epci',
}

@Schema({ _id: false })
export class Perimeter {
  @IsDefined()
  @IsEnum(TypePerimeterEnum)
  @Prop({ type: SchemaTypes.String, enum: TypePerimeterEnum })
  @ApiProperty({ enum: TypePerimeterEnum, required: false })
  type: TypePerimeterEnum;

  @IsDefined()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  code: string;
}

export const PerimeterSchema = SchemaFactory.createForClass(Perimeter);

@Schema({ collection: 'chefs_de_file' })
export class ChefDeFile extends DateEntity {
  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  nom: string;

  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  email: string;

  @Prop({ type: Boolean, default: false })
  @ApiProperty({ type: Boolean, required: false })
  isEmailPublic: boolean;

  @Prop({ type: [PerimeterSchema], default: [] })
  @ApiProperty({ type: () => Perimeter, required: false, isArray: true })
  perimetre?: Perimeter[];
}

export const ChefDeFileSchema = SchemaFactory.createForClass(ChefDeFile);
