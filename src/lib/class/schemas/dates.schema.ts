import { Prop } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

export class DateEntity {
  @Prop({ type: SchemaTypes.Date, default: Date.now })
  _created?: Date;

  @Prop({ type: SchemaTypes.Date, default: Date.now })
  _updated?: Date;
}
