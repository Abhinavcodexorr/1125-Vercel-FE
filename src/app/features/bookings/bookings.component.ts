import { CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { Booking, BookingSection, sectionToBookingFilter } from '../../core/models/booking.model';
import { AuthService } from '../../core/services/auth.service';
import { BookingApiService } from '../../core/services/booking-api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

const SECTIONS: BookingSection[] = ['incomplete', 'complete', 'cancelled'];

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [PageHeaderComponent, EmptyStateComponent, CurrencyPipe, DatePipe, UpperCasePipe],
  template: `
    <app-page-header [title]="pageTitle()" [subtitle]="pageSubtitle()">
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
      <span class="result-count filter-spacer">{{ visibleBookings().length }} of {{ sectionBookings().length }}</span>
    </div>

    @if (bookingApi.loading() && bookingApi.bookings().length === 0) {
      <app-empty-state icon="☰" title="Loading bookings…" message="Fetching reservations from the server." />
    } @else if (sectionBookings().length === 0) {
      <app-empty-state icon="☰" [title]="emptyTitle()" [message]="emptyMessage()" />
    } @else if (visibleBookings().length === 0) {
      <app-empty-state
        icon="⌕"
        title="No matching bookings"
        message="Try a different guest name, email, room, or booking reference."
      />
    } @else {
      <div class="table-wrap">
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
            @for (b of visibleBookings(); track b.id) {
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
                <td>{{ b.grandTotal | currency: b.currency || 'USD':'symbol':'1.0-0' }}</td>
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
    }
  `,
  styles: `
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

  protected readonly actionId = signal<string | null>(null);
  protected readonly searchQuery = signal('');

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

  protected readonly visibleBookings = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.sectionBookings();
    if (!query) return list;

    return list.filter((booking) => this.matchesSearch(booking, query));
  });

  ngOnInit(): void {
    this.refresh();
    this.route.paramMap.subscribe(() => {
      this.searchQuery.set('');
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
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
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

  protected confirmBooking(booking: Booking): void {
    if (!confirm(`Confirm booking for ${booking.guest.firstName} ${booking.guest.lastName}?`)) return;

    this.actionId.set(booking.id);
    this.bookingApi.manualConfirm(booking.id).subscribe({
      next: () => {
        this.actionId.set(null);
        this.refresh();
      },
      error: () => this.actionId.set(null),
    });
  }

  protected cancelBooking(booking: Booking): void {
    if (!confirm(`Cancel booking for ${booking.guest.firstName} ${booking.guest.lastName}?`)) return;

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

  protected pageSubtitle(): string {
    switch (this.section()) {
      case 'complete':
        return 'Paid and confirmed guest reservations.';
      case 'cancelled':
        return 'Reservations that were cancelled.';
      default:
        return 'Bookings awaiting payment or confirmation.';
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
        return 'Cancelled reservations will appear here.';
      default:
        return 'Bookings awaiting payment or confirmation will appear here.';
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
