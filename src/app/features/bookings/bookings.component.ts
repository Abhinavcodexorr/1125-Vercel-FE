import { DatePipe, UpperCasePipe } from '@angular/common';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { Booking, BookingSection, sectionToBookingFilter } from '../../core/models/booking.model';
import { AuthService } from '../../core/services/auth.service';
import { BookingApiService } from '../../core/services/booking-api.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginationBarComponent } from '../../shared/components/pagination-bar/pagination-bar.component';

const SECTIONS: BookingSection[] = ['incomplete', 'complete', 'cancelled'];
const PAGE_SIZE = 15;

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [PageHeaderComponent, EmptyStateComponent, PaginationBarComponent, AppCurrencyPipe, DatePipe, UpperCasePipe],
  template: `
    <app-page-header [title]="pageTitle()" [showEyebrow]="false">
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        (click)="refresh()"
        [disabled]="bookingApi.loading()"
      >
        {{ bookingApi.loading() ? 'Loading…' : 'Refresh' }}
      </button>
    </app-page-header>

    @if (bookingApi.error()) {
      <div class="alert alert-error">{{ bookingApi.error() }}</div>
    }

    <div class="filter-bar">
      <label for="booking-search">Search</label>
      <input
        id="booking-search"
        type="search"
        placeholder="Guest, email, room, reference…"
        [value]="searchQuery()"
        (input)="onSearchInput($event)"
      />
      @if (searchQuery()) {
        <button type="button" class="btn btn-ghost btn-sm" (click)="clearSearch()">Clear</button>
      }
      <span class="result-count filter-spacer">{{ filteredBookings().length }} total</span>
    </div>

    @if (bookingApi.loading() && bookingApi.bookings().length === 0) {
      <app-empty-state icon="☰" title="Loading bookings…" />
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
        <div class="table-wrap list-scroll bookings-table">
          <table>
            <thead>
              <tr>
                <th>Guest</th>
                <th>Type</th>
                <th>Stay</th>
                <th>Dates</th>
                <th>Guests</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                @if (showActionsColumn()) {
                  <th>Actions</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (b of paginatedBookings(); track b.id) {
                <tr [class.row-cancelled]="b.status === 'cancelled'">
                  <td>
                    <strong>{{ b.guest.firstName }} {{ b.guest.lastName }}</strong>
                    <small>{{ b.guest.email }}</small>
                    @if (b.guest.mobileNumber) {
                      <small>{{ b.guest.mobileNumber }}</small>
                    }
                    @if (b.bookingReference) {
                      <small>#{{ b.bookingReference }}</small>
                    }
                  </td>
                <td>
                  {{ b.bookingType || b.snapshot.categoryName }}
                  <small>{{ b.snapshot.categoryName }}</small>
                </td>
                <td>{{ b.stayName || b.snapshot.roomTitle }}</td>
                <td>
                  {{ b.checkIn | date: 'MMM d, y' }}
                  <small>→ {{ b.checkOut | date: 'MMM d, y' }}</small>
                  @if (b.nights) {
                    <small>{{ b.nights }} night{{ b.nights === 1 ? '' : 's' }}</small>
                  }
                </td>
                <td>
                  {{ guestSummary(b) }}
                  @if (b.adults !== undefined || b.children !== undefined) {
                    <small>{{ b.adults ?? 0 }} adults · {{ b.children ?? 0 }} children</small>
                  }
                </td>
                <td>{{ b.grandTotal | appCurrency: b.currency }}</td>
                <td>
                  <span class="pay-method">{{ (b.payment.type || b.payment.method) | uppercase }}</span>
                  <small
                    [class.captured]="b.payment.status === 'captured' || b.payment.status === 'paid'"
                    [class.failed]="b.payment.status === 'failed'"
                  >
                    {{ b.payment.status }}
                  </small>
                </td>
                <td>
                  <span class="badge-status" [class]="statusClass(b.status)">{{ statusLabel(b.status) }}</span>
                </td>
                @if (showActionsColumn()) {
                  <td class="actions-cell">
                    @if (section() === 'incomplete') {
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        [disabled]="actionId() === b.id"
                        (click)="confirmBooking(b)"
                      >
                        Confirm
                      </button>
                    }
                    <button
                      type="button"
                      class="btn btn-danger btn-sm"
                      [disabled]="actionId() === b.id"
                      (click)="cancelBooking(b)"
                    >
                      Cancel
                    </button>
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
          (previous)="prevPage()"
          (next)="nextPage()"
        />
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .filter-bar {
      flex-shrink: 0;
    }

    .bookings-table table {
      width: 100%;
      min-width: 56rem;
      border-collapse: collapse;
    }

    .bookings-table th,
    .bookings-table td {
      min-width: 6.5rem;
      vertical-align: top;
    }

    .bookings-table th:first-child,
    .bookings-table td:first-child {
      min-width: 10rem;
    }

    .pay-method {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--primary-dark);
    }

    .captured {
      color: var(--success) !important;
    }

    .failed {
      color: var(--danger) !important;
    }

    .row-cancelled td {
      opacity: 0.72;
    }

    .badge-completed,
    .badge-checked_in,
    .badge-checked_out {
      background: #e6f4ed;
      color: var(--success);
    }

    .badge-cancelled {
      background: #fdeaea;
      color: var(--danger);
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

  protected guestSummary(booking: Booking): string {
    return `${booking.numGuests} guest${booking.numGuests === 1 ? '' : 's'}`;
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
      title: 'Cancel booking',
      message: `Cancel booking for ${booking.guest.firstName} ${booking.guest.lastName}? This action cannot be undone.`,
      confirmLabel: 'Yes, cancel',
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
        return 'Paid bookings';
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
        return 'Paid reservations will appear here.';
      case 'cancelled':
      default:
        return '';
    }
  }

  protected statusLabel(status: Booking['status']): string {
    switch (status) {
      case 'pending':
        return 'Incomplete';
      case 'confirmed':
        return 'Confirmed';
      case 'completed':
        return 'Completed';
      case 'checked_in':
        return 'Checked in';
      case 'checked_out':
        return 'Checked out';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  protected statusClass(status: Booking['status']): string {
    switch (status) {
      case 'pending':
        return 'badge-pending';
      case 'confirmed':
        return 'badge-confirmed';
      case 'completed':
      case 'checked_in':
      case 'checked_out':
        return 'badge-completed';
      case 'cancelled':
        return 'badge-cancelled';
      default:
        return 'badge-inactive';
    }
  }
}
