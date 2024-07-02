import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { SchemaTypes, Types } from 'mongoose';

export class DateEntity {
  @Prop({ type: SchemaTypes.ObjectId, auto: true })
  @ApiProperty({ type: String, required: false })
  _id: Types.ObjectId;

  @Prop({ type: SchemaTypes.Date, default: Date.now })
  @ApiProperty({ required: false })
  _created?: Date;

  @Prop({ type: SchemaTypes.Date, default: Date.now })
  @ApiProperty({ required: false })
  _updated?: Date;
}
