import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

import { DateEntity } from '@/lib/class/schemas/dates.schema';

@Schema({ collection: 'mandataires' })
export class Mandataire extends DateEntity {
  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  nom: string;

  @Prop({ type: String })
  @ApiProperty({ type: String, required: false })
  email: string;
}

export const MandataireSchema = SchemaFactory.createForClass(Mandataire);
