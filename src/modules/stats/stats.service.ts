import { Injectable } from '@nestjs/common';
import {
  add,
  endOfDay,
  format,
  compareDesc,
  subYears,
  subMonths,
  subWeeks,
} from 'date-fns';
import { keyBy, groupBy, mapValues } from 'lodash';

import { DateFromToQueryTransformed } from '@/lib/class/pipes/date_from_to.pipe';
import { RevisionService } from '@/modules/revision/revision.service';
import { Revision } from '@/modules/revision/revision.entity';
import { ClientService } from '@/modules/client/client.service';
import { FirstPublicationDTO } from './dto/first_pulication.dto';
import { PublicationDTO } from './dto/publication.dto';
import { Client } from '../client/client.entity';
import { Between, In } from 'typeorm';
import { MetricsIncubateurDTO } from './dto/metrics_incubateur.dto';

const CLIENTS_TO_MONITOR = {
  mesAdresses: 'mes-adresses',
  moissonneur: 'moissonneur-bal',
};

export interface RevisionLast {
  codeCommune: string;
  publishedAt: Date;
  totalCount: number;
}

export interface RevisionAgg {
  codeCommune: string;
  publishedAt: Date;
  clientId: string;
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
      legacyId: In(Object.values(CLIENTS_TO_MONITOR)),
    });

    this.clientsToMonitorIndex = keyBy(clientsToMonitor, 'id');
  }

  public async findFirstPublications(
    dates: DateFromToQueryTransformed,
  ): Promise<FirstPublicationDTO[]> {
    const revisionAgg: RevisionAgg[] = await this.revisionService.findFirsts();
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
          ({ clientId }) =>
            this.clientsToMonitorIndex[clientId]?.legacyId ===
            CLIENTS_TO_MONITOR.mesAdresses,
        ).length,
        viaMoissonneur: dailyCreations.filter(
          ({ clientId }) =>
            this.clientsToMonitorIndex[clientId]?.legacyId ===
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
      publishedAt: Between(dates.from, dates.to),
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

  public async metricsIncubateur(
    offset?: number,
    limit?: number,
  ): Promise<MetricsIncubateurDTO> {
    const revisions: RevisionLast[] = await this.revisionService.findLasts({
      offset,
      limit,
    });
    const now = new Date();
    return {
      count: Number(revisions[0]?.totalCount) || 0,
      results: revisions.map((revision) => ({
        insee: revision.codeCommune,
        metrics: {
          tu: 1,
          yau: subYears(now, 1) <= revision.publishedAt ? 1 : 0,
          mau: subMonths(now, 1) <= revision.publishedAt ? 1 : 0,
          wau: subWeeks(now, 1) <= revision.publishedAt ? 1 : 0,
        },
      })),
    };
  }
}
