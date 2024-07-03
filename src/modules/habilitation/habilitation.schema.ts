import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { SchemaTypes, Types } from 'mongoose';

export enum StatusHabilitationEnum {
  ACCEPTED = 'accepted',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

export enum TypeStrategyEnum {
  EMAIL = 'email',
  FRANCECONNECT = 'franceconnect',
  INTERNAL = 'internal',
}

export interface Mandat {
  nomMarital: string;
  nomNaissance: string;
  prenom: string;
}

@Schema({ _id: false })
export class Strategy {
  @Prop({ type: SchemaTypes.String, enum: TypeStrategyEnum })
  @ApiProperty({ enum: TypeStrategyEnum, required: false })
  type: TypeStrategyEnum;

  // EMAIL

  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  pinCode?: string;

  @Prop({ type: Date })
  @ApiProperty({ type: Date, required: false })
  pinCodeExpiration?: Date | null;

  @Prop({ type: Date })
  @ApiProperty({ type: Date, required: false })
  createdAt?: Date | null;

  @Prop({ type: Number })
  @ApiProperty({ type: Number, required: false })
  remainingAttempts?: number;

  // FRANCECONNECT

  @Prop({ type: Object })
  @ApiProperty({ type: Object, required: false })
  mandat?: Mandat;

  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  authenticationError?: string;
}

export const StrategySchema = SchemaFactory.createForClass(Strategy);

@Schema({ collection: 'habilitations' })
export class Habilitation {
  @Prop({ type: SchemaTypes.ObjectId, auto: true })
  @ApiProperty({ type: String, required: false })
  _id?: Types.ObjectId;

  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  codeCommune: string;

  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  emailCommune?: string;

  @Prop({ type: SchemaTypes.ObjectId })
  @ApiProperty({ type: String, required: false })
  client: Types.ObjectId;

  @Prop({ type: SchemaTypes.String, enum: StatusHabilitationEnum })
  @ApiProperty({ enum: StatusHabilitationEnum, required: false })
  status: StatusHabilitationEnum;

  @Prop({ type: StrategySchema })
  @ApiProperty({ type: () => Strategy, required: false })
  strategy?: Strategy;

  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  franceconnectAuthenticationUrl?: string;

  @Prop({ type: SchemaTypes.Date, default: Date.now })
  @ApiProperty()
  createdAt?: Date;

  @Prop({ type: SchemaTypes.Date, default: Date.now })
  @ApiProperty()
  updatedAt?: Date;

  @Prop({ type: SchemaTypes.Date })
  @ApiProperty()
  expiresAt?: Date;

  @Prop({ type: SchemaTypes.Date })
  @ApiProperty()
  acceptedAt?: Date;

  @Prop({ type: SchemaTypes.Date })
  @ApiProperty()
  rejectedAt?: Date;
}

export const HabilitationSchema = SchemaFactory.createForClass(Habilitation);
