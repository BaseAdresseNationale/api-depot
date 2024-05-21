import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class PublicClient {
  @ApiProperty({ type: String, required: false })
  _id: Types.ObjectId;

  @ApiProperty({ type: String, required: false })
  id: string;

  @ApiProperty({ type: String, required: false })
  nom: string;

  @ApiProperty({ type: String, required: false })
  mandataire: string;

  @ApiProperty({ type: String, required: false })
  chefDeFile?: string;

  @ApiProperty({ type: String, required: false })
  chefDeFileEmail?: string;
}
