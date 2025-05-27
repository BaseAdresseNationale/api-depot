import { isCommune } from '@/lib/utils/cog.utils';
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidationCogPipe implements PipeTransform {
  transform(value: string[]) {
    if (value) {
      for (const codeCommune of value) {
        if (!isCommune(codeCommune)) {
          throw new BadRequestException(`Code commune ${codeCommune} invalide`);
        }
      }
    }
    return value;
  }
}
