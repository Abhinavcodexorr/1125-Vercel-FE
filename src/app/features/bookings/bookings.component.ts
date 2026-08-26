import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { currencyDisplaySymbol } from '../../core/constants/currencies';
import { Booking, BookingSection, countNights, sectionToBookingFilter } from '../../core/models/booking.model';
import { AuthService } from '../../core/services/auth.service';
import { BookingApiService } from '../../core/services/booking-api.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginationBarComponent } from '../../shared/components/pagination-bar/pagination-bar.component';
import { ShimmerListComponent } from '../../shared/components/shimmer-list/shimmer-list.component';

const SECTIONS: BookingSection[] = ['incomplete', 'complete', 'cancelled'];
const PAGE_SIZE = 15;

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [PageHeaderComponent, EmptyStateComponent, PaginationBarComponent, ShimmerListComponent, DatePipe, DecimalPipe],
  template: `
    <app-page-header [title]="pageTitle()" [showEyebrow]="false" [showDivider]="false">
      <div class="header-search">
        <label class="search-field" for="booking-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            id="booking-search"
            type="search"
            placeholder="Search guest, email, room, or reference…"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
          />
        </label>
        @if (searchQuery()) {
          <button type="button" class="btn btn-ghost btn-sm" (click)="clearSearch()">Clear</button>
        }
      </div>
    </app-page-header>

    @if (bookingApi.error()) {
      <div class="alert alert-error">{{ bookingApi.error() }}</div>
    }

    @if (bookingApi.loading() && bookingApi.bookings().length === 0) {
      <app-shimmer-list [rows]="8" [columns]="8" />
    } @else if (sectionBookings().length === 0) {
      <app-empty-state icon="☰" [title]="emptyTitle()" [message]="emptyMessage()" />
    } @else if (filteredBookings().length === 0) {
      <app-empty-state
        icon="⌕"
        title="No matching bookings"
        message="Try a different guest name, email, room, or booking reference."
      />
    } @else {
      <div class="list-shell">
        <div class="listing-card">
          <div class="table-wrap list-scroll bookings-table">
            <table>
              <thead>
                <tr>
                  <th>Room type</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Nights</th>
                  <th>Customer details</th>
                  <th>Guests</th>
                  <th>Special requests</th>
                  <th>Amount</th>
                  <th class="col-center">Payment status</th>
                  @if (showTransactionColumn()) {
                    <th class="col-center">Transaction ID</th>
                  }
                  <th class="col-center">Booking reference</th>
                  <th>Created date</th>
                  @if (showCancelledDateColumn()) {
                    <th>Cancelled date</th>
                  }
                  @if (showActionsColumn()) {
                    <th class="col-center">Actions</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (b of paginatedBookings(); track b.id) {
                  <tr [class.row-cancelled]="b.status === 'cancelled'">
                    <td class="room-cell">
                      <strong>{{ b.snapshot.categoryName || b.bookingType || '-' }}</strong>
                      @if (b.stayName || b.snapshot.roomTitle) {
                        <small>{{ b.stayName || b.snapshot.roomTitle }}</small>
                      }
                    </td>
                    <td class="date-cell">{{ b.checkIn | date: 'MMM d, y' }}</td>
                    <td class="date-cell">{{ b.checkOut | date: 'MMM d, y' }}</td>
                    <td>{{ nightCount(b) ?? '-' }}</td>
                    <td class="customer-cell">
                      <strong>{{ b.guest.firstName }} {{ b.guest.lastName }}</strong>
                      @if (b.guest.email) {
                        <small>{{ b.guest.email }}</small>
                      }
                      @if (b.guest.mobileNumber) {
                        <small>{{ formatMobile(b.guest.mobileNumber) }}</small>
                      }
                    </td>
                    <td>{{ guestSummary(b) }}</td>
                    <td class="requests-cell">{{ b.specialRequests || '-' }}</td>
                    <td class="amount-cell">
                      <span class="amount-code">{{ currencySymbol(b.currency) }}</span>
                      <strong>{{ b.grandTotal | number: '1.0-0' }}</strong>
                    </td>
                    <td class="col-center">
                      <span class="pay-badge {{ paymentBadgeClass(b.payment.status) }}">
                        {{ paymentStatusLabel(b.payment.status) }}
                      </span>
                    </td>
                    @if (showTransactionColumn()) {
                      <td class="col-center txn-cell">{{ b.payment.transactionId || '-' }}</td>
                    }
                    <td class="col-center">{{ b.bookingReference ? '#' + b.bookingReference : '-' }}</td>
                    <td class="date-cell">{{ localDateTime(b.createdAt) }}</td>
                    @if (showCancelledDateColumn()) {
                      <td class="date-cell">{{ localDateTime(b.cancelledAt) }}</td>
                    }
                    @if (showActionsColumn()) {
                      <td class="actions-cell col-center">
                        @if (section() === 'incomplete') {
                          <button
                            type="button"
                            class="action-btn action-confirm"
                            [disabled]="actionId() === b.id"
                            (click)="confirmBooking(b)"
                          >
                            Confirm
                          </button>
                        }
                        @if (showCancelButton()) {
                          <button
                            type="button"
                            class="action-btn action-cancel"
                            [disabled]="actionId() === b.id"
                            (click)="cancelBooking(b)"
                          >
                            Cancel
                          </button>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <app-pagination-bar
            [page]="page()"
            [totalPages]="totalPages()"
            [total]="filteredBookings().length"
            [disabled]="bookingApi.loading()"
            [showSinglePage]="true"
            (previous)="prevPage()"
            (next)="nextPage()"
            (goTo)="goToPage($event)"
          />
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
    }

    :host ::ng-deep .page-header {
      margin-bottom: 0.35rem;
      padding-bottom: 0;
      gap: 0.75rem;
      flex-shrink: 0;
      align-items: center;
    }

    :host ::ng-deep .page-header h1 {
      font-size: 1.3rem;
      letter-spacing: -0.02em;
    }

    :host ::ng-deep .page-header-text {
      padding-left: 0.7rem;
    }

    :host ::ng-deep .page-header .actions {
      flex: 0 1 28rem;
      width: 28rem;
      max-width: 28rem;
      justify-content: flex-end;
    }

    .header-search {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      width: 100%;
      min-width: 0;
    }

    .search-field {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex: 1;
      min-width: 0;
      padding: 0.42rem 0.9rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-xs);
      background: var(--primary-muted);
    }

    .search-field svg {
      width: 1.1rem;
      height: 1.1rem;
      flex-shrink: 0;
      color: var(--text-muted);
    }

    .search-field input {
      width: 100%;
      min-width: 0;
      border: none;
      background: transparent;
      font-size: 0.9375rem;
      color: var(--text);
      outline: none;
    }

    .search-field:focus-within {
      border-color: var(--primary);
      background: var(--white);
      box-shadow: 0 0 0 3px rgba(124, 165, 200, 0.18);
    }

    .listing-card {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
      background: var(--white);
      border: 1px solid var(--border-light);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }

    .bookings-table.list-scroll {
      max-height: none;
      flex: 1;
      min-height: 0;
      border: none;
      border-radius: 0;
      box-shadow: none;
    }

    :host ::ng-deep .pager {
      border-top: 1px solid var(--border-light);
    }

    .bookings-table table {
      width: 100%;
      min-width: 94rem;
      border-collapse: separate;
      border-spacing: 0;
    }

    .bookings-table th,
    .bookings-table td {
      padding: 0.7rem 1rem;
      vertical-align: middle;
      text-align: left;
      white-space: nowrap;
    }

    .bookings-table th {
      position: sticky;
      top: 0;
      z-index: 4;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #111111;
      background: var(--white);
      border-bottom: 1px solid var(--border);
      box-shadow: 0 1px 0 var(--border);
      white-space: nowrap;
    }

    .bookings-table td {
      font-size: 0.875rem;
      color: var(--text);
      border-bottom: 1px solid var(--border-light);
      background: var(--white);
    }

    .bookings-table tbody tr:nth-child(even) td {
      background: #f7f9fb;
    }

    .bookings-table tbody tr:hover td {
      background: #eef4f8;
    }

    .bookings-table td strong,
    .bookings-table td small {
      display: inline;
      margin: 0;
    }

    .bookings-table td small {
      color: var(--text-muted);
    }

    .bookings-table th.col-center,
    .bookings-table td.col-center,
    .bookings-table td.actions-cell {
      text-align: center;
    }

    .date-cell {
      font-variant-numeric: tabular-nums;
    }

    .bookings-table .room-cell,
    .bookings-table .customer-cell {
      white-space: normal;
    }

    .bookings-table .room-cell {
      max-width: 16rem;
    }

    .bookings-table .customer-cell {
      min-width: 12rem;
      max-width: 18rem;
    }

    .bookings-table .room-cell strong,
    .bookings-table .room-cell small,
    .bookings-table .customer-cell strong,
    .bookings-table .customer-cell small {
      display: block;
    }

    .bookings-table .room-cell small,
    .bookings-table .customer-cell small {
      margin-top: 0.15rem;
      word-break: break-word;
    }

    .amount-cell {
      color: var(--success);
      text-align: left;
    }

    .amount-code {
      display: inline;
      margin-right: 0.25rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .amount-cell strong {
      display: inline;
      font-size: 0.95rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }

    .pay-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.28rem 0.7rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      line-height: 1;
    }

    .pay-badge.is-paid {
      background: #e6f4ed;
      color: var(--success);
    }

    .pay-badge.is-failed {
      background: #fdeaea;
      color: var(--danger);
    }

    .pay-badge.is-pending {
      background: #fef6e6;
      color: var(--warning);
    }

    .requests-cell {
      max-width: 14rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-secondary);
    }

    .txn-cell {
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .actions-cell {
      display: table-cell;
      white-space: nowrap;
      vertical-align: middle;
      text-align: center;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      min-height: 2rem;
      padding: 0.3rem 0.8rem;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      cursor: pointer;
      white-space: nowrap;
      line-height: 1;
      vertical-align: middle;
      transition: background var(--transition), color var(--transition), border-color var(--transition);
    }

    .action-confirm {
      background: #e6f4ed;
      color: var(--success);
      border-color: #b8e0cc;
    }

    .action-confirm:hover:not(:disabled) {
      background: var(--success);
      color: var(--white);
      border-color: var(--success);
    }

    .action-cancel {
      background: #fdeaea;
      color: var(--danger);
      border-color: #f3c8c8;
    }

    .action-cancel:hover:not(:disabled) {
      background: var(--danger);
      color: var(--white);
      border-color: var(--danger);
    }

    .action-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .row-cancelled td {
      opacity: 0.72;
    }

    @media (max-width: 720px) {
      .header-search {
        flex-wrap: wrap;
      }

      :host ::ng-deep .page-header .actions {
        flex: 1 1 auto;
        width: 100%;
        max-width: none;
      }

      :host ::ng-deep .page-header h1 {
        font-size: 1.2rem;
      }
    }
  `,
})
export class BookingsComponent implements OnInit {
  protected readonly bookingApi = inject(BookingApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly confirmService = inject(ConfirmService);

  protected readonly actionId = signal<string | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = PAGE_SIZE;

  protected readonly section = toSignal(
    this.route.paramMap.pipe(
      map((params) => {
        const value = params.get('section') as BookingSection | null;
        return value && SECTIONS.includes(value) ? value : 'incomplete';
      }),
    ),
    { initialValue: 'incomplete' as BookingSection },
  );

  /** Bookings returned by GET /booking?filter= for the active tab */
  protected readonly sectionBookings = computed(() => this.bookingApi.bookings());

  protected readonly filteredBookings = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.sectionBookings();
    if (!query) return list;

    return list.filter((booking) => this.matchesSearch(booking, query));
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredBookings().length / this.pageSize)),
  );

  protected readonly paginatedBookings = computed(() => {
    const currentPage = Math.min(this.page(), this.totalPages());
    const start = (currentPage - 1) * this.pageSize;
    return this.filteredBookings().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.refresh();
    this.route.paramMap.subscribe(() => {
      this.searchQuery.set('');
      this.page.set(1);
      this.refresh();
    });
  }

  protected canManage(): boolean {
    return this.auth.user()?.role !== 'SubAdmin';
  }

  protected showActionsColumn(): boolean {
    return this.canManage() && this.section() !== 'cancelled';
  }

  protected showTransactionColumn(): boolean {
    return this.section() === 'complete' || this.section() === 'cancelled';
  }

  protected showCancelledDateColumn(): boolean {
    return this.section() === 'cancelled';
  }

  protected showCancelButton(): boolean {
    return this.canManage() && this.section() === 'complete';
  }

  protected refresh(): void {
    this.bookingApi.loadByFilter(sectionToBookingFilter(this.section())).subscribe();
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.page.set(1);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
    this.page.set(1);
  }

  protected prevPage(): void {
    if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
  }

  protected nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((p) => p + 1);
  }

  protected goToPage(page: number): void {
    const next = Math.min(this.totalPages(), Math.max(1, page));
    this.page.set(next);
  }

  protected guestSummary(booking: Booking): string {
    return `${booking.numGuests} guest${booking.numGuests === 1 ? '' : 's'}`;
  }

  protected formatMobile(value?: string): string {
    const raw = value?.trim();
    if (!raw) return '';
    return raw.startsWith('+') ? raw : `+${raw}`;
  }

  protected localDateTime(value?: string): string {
    if (!value) return '-';
    const raw = value.trim();
    const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw);
    const date = new Date(hasZone ? raw : raw.includes('T') || raw.includes(' ') ? `${raw.replace(' ', 'T')}Z` : `${raw}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  protected currencySymbol(code?: string): string {
    return currencyDisplaySymbol(code);
  }

  protected nightCount(booking: Booking): number | undefined {
    return countNights(booking.checkIn, booking.checkOut, booking.nights);
  }

  protected paymentStatusLabel(status?: string): string {
    const value = (status ?? '').trim().toLowerCase();
    if (!value || value === '—') return '-';
    if (value === 'paid' || value === 'captured') return 'Paid';
    return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  protected paymentBadgeClass(status?: string): string {
    const value = (status ?? '').trim().toLowerCase();
    if (value === 'paid' || value === 'captured') return 'is-paid';
    if (value === 'failed' || value === 'refunded' || value === 'cancelled') return 'is-failed';
    return 'is-pending';
  }

  private matchesSearch(booking: Booking, query: string): boolean {
    const haystack = [
      booking.guest.firstName,
      booking.guest.lastName,
      `${booking.guest.firstName} ${booking.guest.lastName}`,
      booking.guest.email,
      booking.guest.mobileNumber,
      booking.bookingReference,
      booking.bookingType,
      booking.stayName,
      booking.snapshot.roomTitle,
      booking.snapshot.categoryName,
      booking.status,
      booking.payment.status,
      booking.payment.method,
      booking.payment.type,
      booking.payment.transactionId,
      booking.specialRequests,
      booking.id,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  }

  protected async confirmBooking(booking: Booking): Promise<void> {
    const ok = await this.confirmService.confirm({
      title: 'Confirm booking',
      message: `Confirm booking for ${booking.guest.firstName} ${booking.guest.lastName}?`,
      confirmLabel: 'Confirm booking',
    });
    if (!ok) return;

    this.actionId.set(booking.id);
    this.bookingApi.manualConfirm(booking.id).subscribe({
      next: () => {
        this.actionId.set(null);
        this.refresh();
      },
      error: () => this.actionId.set(null),
    });
  }

  protected async cancelBooking(booking: Booking): Promise<void> {
    const ok = await this.confirmService.confirm({
      title: 'ARE YOU SURE YOU WANT TO CANCEL THIS BOOKING?',
      message: '',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
      variant: 'danger',
    });
    if (!ok) return;

    this.actionId.set(booking.id);
    this.bookingApi.cancel(booking.id).subscribe({
      next: () => {
        this.actionId.set(null);
        this.refresh();
      },
      error: () => this.actionId.set(null),
    });
  }

  protected pageTitle(): string {
    switch (this.section()) {
      case 'complete':
        return 'Complete bookings';
      case 'cancelled':
        return 'Cancelled bookings';
      default:
        return 'Incomplete bookings';
    }
  }

  protected emptyTitle(): string {
    return `No ${this.section()} bookings`;
  }

  protected emptyMessage(): string {
    switch (this.section()) {
      case 'complete':
        return 'Complete bookings will appear here.';
      case 'cancelled':
      default:
        return '';
    }
  }
}
