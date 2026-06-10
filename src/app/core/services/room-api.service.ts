import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import {
  AdminRoom,
  ApiRoomDocument,
  RoomAvailability,
  RoomBlockDatePayload,
  RoomBlockDatesMutationResult,
  RoomBlockDatesPayload,
  RoomBlockedDatesData,
  RoomCreatePayload,
  RoomStatusPayload,
  RoomUpdatePayload,
  mapApiRoom,
  unwrapApiData,
  unwrapApiItem,
  unwrapApiList,
} from '../models/room.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class RoomApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  private readonly roomsSignal = signal<AdminRoom[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly rooms = this.roomsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /** GET /rooms/admin — optional ?isActive=true|false */
  loadAll(isActive?: boolean): Observable<AdminRoom[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    let url = `${this.api.baseUrl}/rooms/admin`;
    if (isActive === true) url += '?isActive=true';
    if (isActive === false) url += '?isActive=false';

    return this.http
      .get<unknown>(url, {
        headers: this.api.authHeaders(),
      })
      .pipe(
        map((body) => unwrapApiList<ApiRoomDocument>(body).map(mapApiRoom)),
        tap((rooms) => {
          this.roomsSignal.set(rooms);
          this.loadingSignal.set(false);
        }),
        catchError((err) => this.handleError(err)),
      );
  }

  /** GET /rooms/admin/:idOrSlug */
  getOne(idOrSlug: string): Observable<AdminRoom> {
    return this.http
      .get<unknown>(`${this.api.baseUrl}/rooms/admin/${encodeURIComponent(idOrSlug)}`, {
        headers: this.api.authHeaders(),
      })
      .pipe(
        map((body) => mapApiRoom(unwrapApiItem<ApiRoomDocument>(body))),
        catchError((err) => this.handleError(err)),
      );
  }

  /** POST /rooms */
  create(payload: RoomCreatePayload): Observable<AdminRoom> {
    return this.http
      .post<unknown>(`${this.api.baseUrl}/rooms`, payload, {
        headers: this.api.authHeaders(),
      })
      .pipe(
        map((body) => mapApiRoom(unwrapApiItem<ApiRoomDocument>(body))),
        tap((room) => this.roomsSignal.update((list) => [...list, room])),
        catchError((err) => this.handleError(err)),
      );
  }

  /** PUT /rooms/:idOrSlug */
  update(idOrSlug: string, payload: RoomUpdatePayload): Observable<AdminRoom> {
    return this.http
      .put<unknown>(`${this.api.baseUrl}/rooms/${encodeURIComponent(idOrSlug)}`, payload, {
        headers: this.api.authHeaders(),
      })
      .pipe(
        map((body) => mapApiRoom(unwrapApiItem<ApiRoomDocument>(body))),
        tap((room) =>
          this.roomsSignal.update((list) =>
            list.map((r) => (r.id === room.id || r.slug === room.slug ? room : r)),
          ),
        ),
        catchError((err) => this.handleError(err)),
      );
  }

  /** PUT /rooms/:idOrSlug/status */
  setStatus(idOrSlug: string, isActive: boolean): Observable<AdminRoom> {
    const payload: RoomStatusPayload = { isActive };

    return this.http
      .put<unknown>(
        `${this.api.baseUrl}/rooms/${encodeURIComponent(idOrSlug)}/status`,
        payload,
        { headers: this.api.authHeaders() },
      )
      .pipe(
        map((body) => mapApiRoom(unwrapApiItem<ApiRoomDocument>(body))),
        tap((room) =>
          this.roomsSignal.update((list) =>
            list.map((r) => (r.id === room.id || r.slug === room.slug ? room : r)),
          ),
        ),
        catchError((err) => this.handleError(err)),
      );
  }

  /** GET /rooms/:idOrSlug/availability */
  getAvailability(idOrSlug: string): Observable<RoomAvailability> {
    return this.http
      .get<unknown>(
        `${this.api.baseUrl}/rooms/${encodeURIComponent(idOrSlug)}/availability`,
        { headers: this.api.authHeaders() },
      )
      .pipe(
        map((body) => unwrapApiData<RoomAvailability>(body)),
        catchError((err) => throwError(() => err)),
      );
  }

  /** GET /rooms/:idOrSlug/blocked-dates */
  getBlockedDates(idOrSlug: string): Observable<RoomBlockedDatesData> {
    return this.http
      .get<unknown>(
        `${this.api.baseUrl}/rooms/${encodeURIComponent(idOrSlug)}/blocked-dates`,
        { headers: this.api.authHeaders() },
      )
      .pipe(
        map((body) => unwrapApiData<RoomBlockedDatesData>(body)),
        catchError((err) => throwError(() => err)),
      );
  }

  /** POST /rooms/:idOrSlug/blocked-dates */
  addBlockedDates(
    idOrSlug: string,
    payload: RoomBlockDatesPayload,
  ): Observable<RoomBlockDatesMutationResult> {
    return this.http
      .post<unknown>(
        `${this.api.baseUrl}/rooms/${encodeURIComponent(idOrSlug)}/blocked-dates`,
        payload,
        { headers: this.api.authHeaders() },
      )
      .pipe(
        map((body) => unwrapApiData<RoomBlockDatesMutationResult>(body)),
        catchError((err) => throwError(() => err)),
      );
  }

  /** DELETE /rooms/:idOrSlug/blocked-dates/:blockId */
  removeBlockedDate(idOrSlug: string, blockId: string): Observable<RoomBlockDatesMutationResult> {
    return this.http
      .delete<unknown>(
        `${this.api.baseUrl}/rooms/${encodeURIComponent(idOrSlug)}/blocked-dates/${encodeURIComponent(blockId)}`,
        { headers: this.api.authHeaders() },
      )
      .pipe(
        map((body) => unwrapApiData<RoomBlockDatesMutationResult>(body)),
        catchError((err) => throwError(() => err)),
      );
  }

  /** DELETE /rooms/:idOrSlug (soft delete) */
  delete(idOrSlug: string): Observable<void> {
    return this.http
      .delete<void>(`${this.api.baseUrl}/rooms/${encodeURIComponent(idOrSlug)}`, {
        headers: this.api.authHeaders(),
      })
      .pipe(
        tap(() =>
          this.roomsSignal.update((list) =>
            list.filter((r) => r.id !== idOrSlug && r.slug !== idOrSlug),
          ),
        ),
        catchError((err) => this.handleError(err)),
      );
  }

  filterRooms(list: AdminRoom[], _showDeleted: boolean): AdminRoom[] {
    return list;
  }

  private handleError(err: unknown): Observable<never> {
    let message = 'Request failed';
    if (err && typeof err === 'object' && 'error' in err) {
      const apiErr = (err as { error?: { message?: string } }).error;
      if (apiErr?.message) message = apiErr.message;
    }

    this.errorSignal.set(message);
    this.loadingSignal.set(false);
    return throwError(() => err);
  }
}
