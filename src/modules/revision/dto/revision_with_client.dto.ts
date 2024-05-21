import { Revision } from '../revision.schema';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { PublicClient } from 'src/modules/client/dto/public_client.dto';
import { File } from 'src/modules/file/file.schema';

export class RevisionWithClientDTO extends OmitType(Revision, ['client']) {
  @ApiProperty({ type: () => PublicClient, required: false })
  client?: PublicClient;

  @ApiProperty({ type: () => File, required: false })
  file?: File;
}
