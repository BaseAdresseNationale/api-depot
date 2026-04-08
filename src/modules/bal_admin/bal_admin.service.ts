import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { Client } from '../client/client.entity';
import { ChefDeFile } from '../chef_de_file/chef_de_file.entity';
import { Perimeter } from '../chef_de_file/perimeters.entity';

type PerimeterPayload = Pick<Perimeter, 'type' | 'code'>;

type ClientPayload = {
  clientId: string;
  name: string;
  type: 'api-depot';
  perimeters: PerimeterPayload[];
};

@Injectable()
export class BalAdminService {
  private readonly logger = new Logger(BalAdminService.name);

  constructor(private readonly httpService: HttpService) {}

  private buildPayload(client: Client, chefDeFile: ChefDeFile): ClientPayload {
    const perimeters = chefDeFile
      ? (chefDeFile.perimeters ?? []).map(({ type, code }) => ({
          type,
          code,
        }))
      : undefined;

    return {
      clientId: client.id,
      name: client.nom,
      type: 'api-depot',
      perimeters,
    };
  }

  async createClient(client: Client, chefDeFile: ChefDeFile): Promise<void> {
    await firstValueFrom(
      this.httpService
        .post<void>('/clients', this.buildPayload(client, chefDeFile))
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(
              `Impossible de créer le client bal-admin pour le client ${client.id}`,
              error.message,
            );
            return [];
          }),
        ),
    );
  }

  async updateClientPerimeters(
    client: Client,
    chefDeFile: ChefDeFile,
  ): Promise<void> {
    await firstValueFrom(
      this.httpService
        .put<void>(
          `/clients/${client.id}`,
          this.buildPayload(client, chefDeFile),
        )
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(
              `Impossible de mettre à jour les périmètres bal-admin pour le client ${client.id}`,
              error.message,
            );
            return [];
          }),
        ),
    );
  }

  async deleteClient(clientId: string): Promise<void> {
    await firstValueFrom(
      this.httpService.delete<void>(`/clients/${clientId}`).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(
            `Impossible de supprimer le client bal-admin pour le client ${clientId}`,
            error.message,
          );
          return [];
        }),
      ),
    );
  }

  async restoreClient(clientId: string): Promise<void> {
    await firstValueFrom(
      this.httpService.put<void>(`/clients/${clientId}/restore`, {}).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(
            `Impossible de restaurer le client bal-admin pour le client ${clientId}`,
            error.message,
          );
          return [];
        }),
      ),
    );
  }
}
