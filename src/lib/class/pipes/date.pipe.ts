import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseDatePipe implements PipeTransform {
  transform(value: (string | Date) | (() => string | Date) | undefined | null) {
    if (value) {
      if (typeof value === 'function') {
        value = value();
      }
      const transformedValue = new Date(value);
      if (isNaN(transformedValue.getTime())) {
        throw new BadRequestException('Invalid date');
      }
      return transformedValue;
    }
    return null;
  }
}
