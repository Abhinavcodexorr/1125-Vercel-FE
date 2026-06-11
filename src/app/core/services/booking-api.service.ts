import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, tap, throwError } from 'rxjs';
import {
  ApiBookingDocument,
  Booking,
  BookingCalendarEntry,
  BookingDashboardStats,
  BookingListFilter,
  BookingStatistics,
  BookingStatusPayload,
  mapApiBooking,
  mapBookingDashboardStats,
  mapBookingStatistics,
} from '../models/booking.model';
import { unwrapApiData, unwrapApiItem, unwrapApiList } from '../models/room.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class BookingApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  private readonly bookingsSignal = signal<Booking[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly dashboardSignal = signal<BookingDashboardStats | null>(null);
  private readonly statisticsSignal = signal<BookingStatistics | null>(null);
  private readonly activeFilterSignal = signal<BookingListFilter | null>(null);

  readonly bookings = this.bookingsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly dashboard = this.dashboardSignal.asReadonly();
  readonly statistics = this.statisticsSignal.asReadonly();
  readonly activeFilter = this.activeFilterSignal.asReadonly();

  /** GET /booking/dashboard */
  loadDashboard(): Observable<BookingDashboardStats> {
    return this.http.get<unknown>(`${this.api.baseUrl}/booking/dashboard`).pipe(
      map((body) => mapBookingDashboardStats(unwrapApiData<Record<string, unknown>>(body))),
      tap((stats) => this.dashboardSignal.set(stats)),
      catchError((err) => this.handleError(err)),
    );
  }

  /** GET /booking/calendar */
  loadCalendar(startDate: string, endDate: string): Observable<BookingCalendarEntry[]> {
    const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);

    return this.http
      .get<unknown>(`${this.api.baseUrl}/booking/calendar`, {
        params,
        headers: this.api.authHeaders(),
      })
      .pipe(
        map((body) =>
          unwrapApiList<ApiBookingDocument>(body).map((doc) => {
            const booking = mapApiBooking(doc);
            return {
              id: booking.id,
              bookingReference: booking.bookingReference,
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              status: booking.status,
              roomTitle: booking.snapshot.roomTitle,
              guestName: `${booking.guest.firstName} ${booking.guest.lastName}`.trim(),
            };
          }),
        ),
        catchError((err) => this.handleError(err)),
      );
  }

  /** GET /booking?filter=incomplete|paid|cancelled */
  loadByFilter(filter: BookingListFilter): Observable<Booking[]> {
    return this.loadAll({ filter });
  }

  /** GET /booking */
  loadAll(query: { filter?: BookingListFilter } = {}): Observable<Booking[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    if (query.filter) {
      this.activeFilterSignal.set(query.filter);
    }

    let params = new HttpParams();
    if (query.filter) {
      params = params.set('filter', query.filter);
    }

    return this.http
      .get<unknown>(`${this.api.baseUrl}/booking`, {
        params,
        headers: this.api.authHeaders(),
      })
      .pipe(
        map((body) => unwrapApiList<ApiBookingDocument>(body).map(mapApiBooking)),
        tap((bookings) => this.bookingsSignal.set(bookings)),
        catchError((err) => this.handleError(err)),
        finalize(() => this.loadingSignal.set(false)),
      );
  }

  /** GET /booking/statistics */
  loadStatistics(): Observable<BookingStatistics> {
    return this.http
      .get<unknown>(`${this.api.baseUrl}/booking/statistics`, {
        headers: this.api.authHeaders(),
      })
      .pipe(
        map((body) => mapBookingStatistics(unwrapApiData<Record<string, unknown>>(body))),
        tap((stats) => this.statisticsSignal.set(stats)),
        catchError((err) => this.handleError(err)),
      );
  }

  /** GET /booking/:id */
  getOne(id: string): Observable<Booking> {
    return this.http
      .get<unknown>(`${this.api.baseUrl}/booking/${encodeURIComponent(id)}`, {
        headers: this.api.authHeaders(),
      })
      .pipe(
        map((body) => mapApiBooking(unwrapApiItem<ApiBookingDocument>(body))),
        catchError((err) => this.handleError(err)),
      );
  }

  /** GET /booking/:id/payment-status */
  getPaymentStatus(id: string): Observable<Record<string, unknown>> {
    return this.http
      .get<unknown>(`${this.api.baseUrl}/booking/${encodeURIComponent(id)}/payment-status`, {
        headers: this.api.authHeaders(),
      })
      .pipe(
        map((body) => unwrapApiData<Record<string, unknown>>(body)),
        catchError((err) => this.handleError(err)),
      );
  }

  /** PUT /booking/:id/status */
  updateStatus(id: string, payload: BookingStatusPayload): Observable<Booking> {
    return this.http
      .put<unknown>(`${this.api.baseUrl}/booking/${encodeURIComponent(id)}/status`, payload, {
        headers: this.api.authHeaders(),
      })
      .pipe(
        map((body) => mapApiBooking(unwrapApiItem<ApiBookingDocument>(body))),
        tap((booking) => this.patchBooking(booking)),
        catchError((err) => this.handleError(err)),
      );
  }

  /** PUT /booking/:id/manual-confirm */
  manualConfirm(id: string): Observable<Booking> {
    return this.http
      .put<unknown>(`${this.api.baseUrl}/booking/${encodeURIComponent(id)}/manual-confirm`, {}, {
        headers: this.api.authHeaders(),
      })
      .pipe(
        map((body) => mapApiBooking(unwrapApiItem<ApiBookingDocument>(body))),
        tap((booking) => this.patchBooking(booking)),
        catchError((err) => this.handleError(err)),
      );
  }

  /** PUT /booking/:id/cancel */
  cancel(id: string): Observable<Booking> {
    return this.http
      .put<unknown>(`${this.api.baseUrl}/booking/${encodeURIComponent(id)}/cancel`, {}, {
        headers: this.api.authHeaders(),
      })
      .pipe(
        map((body) => mapApiBooking(unwrapApiItem<ApiBookingDocument>(body))),
        tap((booking) => this.patchBooking(booking)),
        catchError((err) => this.handleError(err)),
      );
  }

  private patchBooking(booking: Booking): void {
    this.bookingsSignal.update((list) => {
      const index = list.findIndex((item) => item.id === booking.id);
      if (index === -1) return [...list, booking];
      const next = [...list];
      next[index] = booking;
      return next;
    });
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
