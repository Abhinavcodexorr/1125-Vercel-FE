import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, tap, throwError } from 'rxjs';
import {
  SubscriberListResult,
  SubscriberQuery,
  mapSubscriberListResponse,
} from '../models/subscriber.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SubscribeApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  private readonly subscribersSignal = signal<SubscriberListResult>({
    subscribers: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly list = this.subscribersSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /** GET /subscribe/admin */
  load(query: SubscriberQuery = {}): Observable<SubscriberListResult> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    let params = new HttpParams()
      .set('page', String(query.page ?? 1))
      .set('limit', String(query.limit ?? 20));

    const search = query.search?.trim();
    if (search) {
      params = params.set('search', search);
    }

    return this.http
      .get<unknown>(`${this.api.baseUrl}/subscribe/admin`, {
        params,
        headers: this.api.authHeaders(),
      })
      .pipe(
        map((body) => mapSubscriberListResponse(body)),
        tap((result) => this.subscribersSignal.set(result)),
        catchError((err) => this.handleError(err)),
        finalize(() => this.loadingSignal.set(false)),
      );
  }

  private handleError(err: unknown): Observable<never> {
    let message = 'Failed to load subscribers';
    if (err && typeof err === 'object' && 'error' in err) {
      const apiErr = (err as { error?: { message?: string } }).error;
      if (apiErr?.message) message = apiErr.message;
    }

    this.errorSignal.set(message);
    this.loadingSignal.set(false);
    return throwError(() => err);
  }
}
