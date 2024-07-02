import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { SchemaTypes, Types } from 'mongoose';

export enum TypeFileEnum {
  BAL = 'bal',
}

@Schema({ collection: 'files' })
export class File {
  @Prop({ type: SchemaTypes.ObjectId, auto: true })
  @ApiProperty({ type: String, required: false })
  _id: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId })
  @ApiProperty({ type: String, required: false })
  revisionId: Types.ObjectId;

  @Prop({ type: String, default: null })
  @ApiProperty({ type: String, required: false })
  name: string | null;

  @Prop({
    type: SchemaTypes.String,
    enum: TypeFileEnum,
    default: TypeFileEnum.BAL,
  })
  @ApiProperty({ enum: TypeFileEnum, required: false })
  type: TypeFileEnum;

  @Prop({ type: Number })
  @ApiProperty({ type: Number, required: false })
  size: number;

  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  hash: string | null;

  @Prop({ type: SchemaTypes.Date, default: Date.now })
  createdAt?: Date;
}

export const FileSchema = SchemaFactory.createForClass(File);
