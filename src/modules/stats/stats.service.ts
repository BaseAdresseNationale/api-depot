import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as Papa from 'papaparse';
import {
  add,
  eachMonthOfInterval,
  endOfDay,
  format,
  compareDesc,
  subYears,
  subMonths,
  subWeeks,
  getMonth,
  getYear,
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

export interface RevisionLastPublished {
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
  private publicationDateByCommune: Map<string, Date> =
    this.loadPublicationDateByCommune();

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

  private loadPublicationDateByCommune(): Map<string, Date> {
    const csvContent = readFileSync(
      join(process.cwd(), 'publication_date.csv'),
      'utf-8',
    );
    const { data } = Papa.parse<{ code: string; publication_date: string }>(
      csvContent,
      { header: true, skipEmptyLines: true },
    );

    return new Map(
      data.map(({ code, publication_date }) => [
        code,
        new Date(publication_date),
      ]),
    );
  }

  public async findFirstPublicationsByMonth(): Promise<Record<string, number>> {
    const revisionsAgg: RevisionAgg[] = await this.revisionService.findFirsts();

    const revisionsAggWithPublicationDate: RevisionAgg[] = revisionsAgg.map(
      (revision) => ({
        ...revision,
        publishedAt:
          this.publicationDateByCommune.get(revision.codeCommune) ??
          revision.publishedAt,
      }),
    );

    const from = new Date(2020, 0, 1);
    const to = new Date();

    const countBeforeFrom = revisionsAggWithPublicationDate.filter(
      ({ publishedAt }) => publishedAt < from,
    ).length;

    const revisionsAggByMonth: Record<string, RevisionAgg[]> = groupBy(
      revisionsAggWithPublicationDate,
      ({ publishedAt }: RevisionAgg) =>
        `${getMonth(publishedAt)}-${getYear(publishedAt)}`,
    );

    let cumul = countBeforeFrom;
    const cumulFirstRevisionsByMonth: Record<string, number> =
      Object.fromEntries(
        eachMonthOfInterval({ start: from, end: to }).map((date) => {
          const month = `${getMonth(date)}-${getYear(date)}`;
          cumul += revisionsAggByMonth[month]?.length ?? 0;
          return [month, cumul];
        }),
      );

    return cumulFirstRevisionsByMonth;
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
      const revisionsGroupByCommunes = groupBy(
        revisions,
        (revision) => revision.codeCommune,
      );
      return {
        date,
        publishedBAL: mapValues(
          revisionsGroupByCommunes,
          (revisionsByCommune) => ({
            total: revisionsByCommune.length,
            viaMesAdresses: revisionsByCommune.filter(
              ({ clientId }) =>
                this.clientsToMonitorIndex[clientId]?.legacyId ===
                CLIENTS_TO_MONITOR.mesAdresses,
            ).length,
            viaMoissonneur: revisionsByCommune.filter(
              ({ clientId }) =>
                this.clientsToMonitorIndex[clientId]?.legacyId ===
                CLIENTS_TO_MONITOR.moissonneur,
            ).length,
          }),
        ),
      };
    });
  }

  public async metricsIncubateur(
    offset?: number,
    limit?: number,
  ): Promise<MetricsIncubateurDTO> {
    const revisions: RevisionLastPublished[] =
      await this.revisionService.findLastsPublished({
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
