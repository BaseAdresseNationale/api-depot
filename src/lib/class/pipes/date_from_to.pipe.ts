import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import {
  sub,
  startOfDay,
  endOfDay,
  isValid,
  parse,
  compareDesc,
} from 'date-fns';

import { DateFromToQuery } from '@/modules/stats/dto/date_to_from.dto';

export type DateFromToQueryTransformed = {
  from: Date;
  to: Date;
};

@Injectable()
export class DateFromToQueryPipe implements PipeTransform {
  private isValidDate(date: string) {
    const dateObj = parse(date, 'yyyy-MM-dd', new Date());
    return isValid(dateObj);
  }

  private checkFromIsBeforeTo(from: string, to: string) {
    const dateFrom = new Date(from);
    const dateTo = new Date(to);
    return compareDesc(dateFrom, dateTo) >= 0;
  }

  transform(query: DateFromToQuery): DateFromToQueryTransformed {
    if ((query.from && !query.to) || (!query.from && query.to)) {
      throw new BadRequestException('Il manque une date from ou to');
    }

    if (query.from && query.to) {
      if (!this.isValidDate(query.from) || !this.isValidDate(query.to)) {
        throw new BadRequestException('Les dates ne sont pas valides');
      }

      if (!this.checkFromIsBeforeTo(query.from, query.to)) {
        throw new BadRequestException(
          'La date from est plus vielle que la date to',
        );
      }
    }

    return {
      from: query.from
        ? startOfDay(new Date(query.from))
        : sub(new Date(), { months: 1 }),
      to: query.to ? endOfDay(new Date(query.to)) : new Date(),
    };
  }
}
