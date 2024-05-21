import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { SchemaTypes, Types } from 'mongoose';
import {
  Habilitation,
  HabilitationSchema,
} from '../habilitation/habilitation.schema';
import { ParseError } from 'src/lib/types/validator.types';

export enum StatusRevisionEnum {
  PENDING = 'pending',
  PUBLISHED = 'published',
}

@Schema({ _id: false })
export class Validation {
  @Prop({ type: Boolean })
  @ApiProperty({ type: Boolean, required: false })
  valid: boolean;

  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  validatorVersion?: string;

  @Prop({ type: [Object] })
  @ApiProperty()
  parseErrors?: ParseError[];

  @Prop({ type: [String] })
  @ApiProperty({ type: String, required: false, isArray: true })
  errors?: string[];

  @Prop({ type: [String] })
  @ApiProperty({ type: String, required: false, isArray: true })
  warnings?: string[];

  @Prop({ type: [String] })
  @ApiProperty({ type: String, required: false, isArray: true })
  infos?: string[];

  @Prop({ type: Number })
  @ApiProperty({ type: Number, required: false })
  rowsCount?: number;
}

export const ValidationSchema = SchemaFactory.createForClass(Validation);

@Schema({ _id: false })
export class Context {
  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  nomComplet?: string;

  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  organisation?: string;

  @Prop({ type: Object })
  @ApiProperty({ type: () => Object, required: false })
  extras?: Record<string, any> | null;
}

export const ContextSchema = SchemaFactory.createForClass(Context);

@Schema({ collection: 'revisions' })
export class Revision {
  @Prop({ type: SchemaTypes.ObjectId, auto: true })
  @ApiProperty({ type: String, required: false })
  _id: Types.ObjectId;

  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  codeCommune: string;

  @Prop({ type: SchemaTypes.ObjectId })
  @ApiProperty({ type: String, required: false })
  client: Types.ObjectId;

  @Prop({ type: SchemaTypes.String, enum: StatusRevisionEnum })
  @ApiProperty({ enum: StatusRevisionEnum, required: false })
  status: StatusRevisionEnum;

  @Prop({ type: Boolean })
  @ApiProperty({ type: Boolean, required: false })
  ready?: boolean | null;

  @Prop({ type: Boolean })
  @ApiProperty({ type: Boolean, required: false })
  current: boolean;

  @Prop({ type: ValidationSchema })
  @ApiProperty({ type: () => Validation, required: false })
  validation?: Validation;

  @Prop({ type: ContextSchema })
  @ApiProperty({ type: () => Context, required: false })
  context?: Context;

  @Prop({ type: HabilitationSchema })
  @ApiProperty({ type: () => Habilitation, required: false })
  habilitation?: Habilitation;

  @Prop({ type: SchemaTypes.Date, default: Date.now })
  @ApiProperty()
  createdAt?: Date;

  @Prop({ type: SchemaTypes.Date, default: Date.now })
  @ApiProperty()
  updatedAt?: Date;

  @Prop({ type: SchemaTypes.Date })
  @ApiProperty()
  publishedAt?: Date;
}

export const RevisionSchema = SchemaFactory.createForClass(Revision);
