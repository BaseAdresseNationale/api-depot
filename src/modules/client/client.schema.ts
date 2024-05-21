import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { SchemaTypes, Types } from 'mongoose';

import { DateEntity } from '@/lib/class/schemas/dates.schema';

export enum AuthorizationStrategyEnum {
  INTERNAL = 'internal',
  CHEF_DE_FILE = 'chef-de-file',
  HABILITATION = 'habilitation',
}

@Schema({ collection: 'clients' })
export class Client extends DateEntity {
  @Prop({ type: SchemaTypes.ObjectId, auto: true })
  @ApiProperty({ type: String, required: false })
  _id: Types.ObjectId;

  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  id: string;

  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  token: string;

  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  nom: string;

  @Prop({ type: SchemaTypes.ObjectId })
  @ApiProperty({ type: String, required: false })
  mandataire: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId })
  @ApiProperty({ type: String, required: false })
  chefDeFile: Types.ObjectId;

  @Prop({ type: SchemaTypes.Boolean })
  @ApiProperty({ required: false })
  active?: boolean;

  @Prop({ type: SchemaTypes.Boolean })
  @ApiProperty({ required: false })
  relaxMode?: boolean;

  @Prop({ type: SchemaTypes.String, enum: AuthorizationStrategyEnum })
  @ApiProperty({ enum: AuthorizationStrategyEnum, required: false })
  authorizationStrategy: AuthorizationStrategyEnum;
}

export const ClientSchema = SchemaFactory.createForClass(Client);
