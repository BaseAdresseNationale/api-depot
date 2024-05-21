import { Injectable } from '@nestjs/common';
import { add, endOfDay, format, compareDesc } from 'date-fns';
import { keyBy, groupBy, mapValues } from 'lodash';

import { DateFromToQueryTransformed } from '@/lib/class/pipes/date_from_to.pipe';
import { RevisionService } from '@/modules/revision/revision.service';
import { Revision } from '@/modules/revision/revision.schema';
import { ClientService } from '@/modules/client/client.service';
import { Client } from '@/modules/client/client.schema';
import { FirstPublicationDTO } from './dto/first_pulication.dto';
import { PublicationDTO } from './dto/publication.dto';

const CLIENTS_TO_MONITOR = {
  mesAdresses: 'mes-adresses',
  moissonneur: 'moissonneur-bal',
};

interface RevisionAgg {
  _id: string;
  publishedAt: Date;
  client: string;
}

@Injectable()
export class StatService {
  clientsToMonitorIndex = [];
  constructor(
    private revisionService: RevisionService,
    private clientService: ClientService,
  ) {
    this.initClients();
  }

  private async initClients() {
    const clientsToMonitor: Client[] = await this.clientService.findMany({
      id: { $in: Object.values(CLIENTS_TO_MONITOR) },
    });

    this.clientsToMonitorIndex = keyBy(clientsToMonitor, '_id');
  }

  public async findFirstPublications(
    dates: DateFromToQueryTransformed,
  ): Promise<FirstPublicationDTO[]> {
    const revisionAgg: RevisionAgg[] = await this.revisionService.aggregate([
      {
        $match: {
          publishedAt: {
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: { codeCommune: '$codeCommune' },
          publishedAt: { $first: '$publishedAt' },
          client: { $first: '$client' },
        },
      },
    ]);

    const cumulFirstRevisionsByDate: FirstPublicationDTO[] = [];
    for (
      let dateIterator = endOfDay(new Date(dates.from.getTime()));
      compareDesc(dateIterator, endOfDay(dates.to)) >= 0;
      dateIterator = add(dateIterator, { days: 1 })
    ) {
      const dailyCreations = revisionAgg.filter(
        ({ publishedAt }) => compareDesc(publishedAt, dateIterator) === 1,
      );
      cumulFirstRevisionsByDate.push({
        date: format(dateIterator, 'yyyy-MM-dd'),
        totalCreations: dailyCreations.length,
        viaMesAdresses: dailyCreations.filter(
          ({ client }) =>
            this.clientsToMonitorIndex[client]?.id ===
            CLIENTS_TO_MONITOR.mesAdresses,
        ).length,
        viaMoissonneur: dailyCreations.filter(
          ({ client }) =>
            this.clientsToMonitorIndex[client]?.id ===
            CLIENTS_TO_MONITOR.moissonneur,
        ).length,
      });
    }

    return cumulFirstRevisionsByDate;
  }

  public async findPublications(
    dates: DateFromToQueryTransformed,
  ): Promise<PublicationDTO[]> {
    const revisions: Revision[] = await this.revisionService.findMany({
      publishedAt: {
        $gte: dates.from,
        $lte: dates.to,
      },
    });

    const revisionsGroupByDays = groupBy(revisions, (revision) =>
      format(revision.publishedAt, 'yyyy-MM-dd'),
    );
    return Object.entries(revisionsGroupByDays).map(([date, revisions]) => {
      const revisionsGroupByBals = groupBy(
        revisions,
        (revision) => revision.codeCommune,
      );
      return {
        date,
        publishedBAL: mapValues(revisionsGroupByBals, (revisionsByBal) => ({
          total: revisionsByBal.length,
          viaMesAdresses: revisionsByBal.filter(
            ({ client }) =>
              this.clientsToMonitorIndex[client]?.id ===
              CLIENTS_TO_MONITOR.mesAdresses,
          ).length,
          viaMoissonneur: revisionsByBal.filter(
            ({ client }) =>
              this.clientsToMonitorIndex[client]?.id ===
              CLIENTS_TO_MONITOR.moissonneur,
          ).length,
        })),
      };
    });
  }
}
