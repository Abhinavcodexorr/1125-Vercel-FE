import { CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { Booking } from '../../core/models/booking.model';
import { DataService } from '../../core/services/data.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

type BookingSection = 'incomplete' | 'complete' | 'cancelled';

const SECTIONS: BookingSection[] = ['incomplete', 'complete', 'cancelled'];

function isIncomplete(booking: Booking): boolean {
  return booking.status === 'pending';
}

function isComplete(booking: Booking): boolean {
  return booking.status === 'confirmed' || booking.status === 'completed';
}

function isCancelled(booking: Booking): boolean {
  return booking.status === 'cancelled';
}

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [PageHeaderComponent, EmptyStateComponent, CurrencyPipe, DatePipe, UpperCasePipe],
  template: `
    <app-page-header [title]="pageTitle()" [subtitle]="pageSubtitle()" />

    @if (visibleBookings().length === 0) {
      <app-empty-state icon="☰" [title]="emptyTitle()" [message]="emptyMessage()" />
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Guest</th>
              <th>Category</th>
              <th>Room</th>
              <th>Dates</th>
              <th>Guests</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            @for (b of visibleBookings(); track b.id) {
              <tr [class.row-cancelled]="b.status === 'cancelled'">
                <td>
                  <strong>{{ b.guest.firstName }} {{ b.guest.lastName }}</strong>
                  <small>{{ b.guest.email }}</small>
                </td>
                <td>{{ b.snapshot.categoryName }}</td>
                <td>{{ b.snapshot.roomTitle }}</td>
                <td>
                  {{ b.checkIn | date: 'MMM d, y' }}
                  <small>→ {{ b.checkOut | date: 'MMM d, y' }}</small>
                </td>
                <td>{{ b.numGuests }}</td>
                <td>{{ b.grandTotal | currency: 'INR':'symbol':'1.0-0' }}</td>
                <td>
                  <span class="pay-method">{{ b.payment.method | uppercase }}</span>
                  <small
                    [class.captured]="b.payment.status === 'captured'"
                    [class.failed]="b.payment.status === 'failed'"
                  >
                    {{ b.payment.status }}
                  </small>
                </td>
                <td>
                  <span class="badge-status" [class]="statusClass(b.status)">{{ statusLabel(b.status) }}</span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    small {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
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

    .badge-completed {
      background: #e6f4ed;
      color: var(--success);
    }

    .badge-cancelled {
      background: #fdeaea;
      color: var(--danger);
    }
  `,
})
export class BookingsComponent {
  protected readonly data = inject(DataService);
  private readonly route = inject(ActivatedRoute);

  private readonly section = toSignal(
    this.route.paramMap.pipe(
      map((params) => {
        const value = params.get('section') as BookingSection | null;
        return value && SECTIONS.includes(value) ? value : 'incomplete';
      }),
    ),
    { initialValue: 'incomplete' as BookingSection },
  );

  protected readonly incompleteBookings = computed(() =>
    this.data.bookingsList().filter(isIncomplete),
  );

  protected readonly completeBookings = computed(() =>
    this.data.bookingsList().filter(isComplete),
  );

  protected readonly cancelledBookings = computed(() =>
    this.data.bookingsList().filter(isCancelled),
  );

  protected readonly visibleBookings = computed(() => {
    switch (this.section()) {
      case 'complete':
        return this.completeBookings();
      case 'cancelled':
        return this.cancelledBookings();
      default:
        return this.incompleteBookings();
    }
  });

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

  protected pageSubtitle(): string {
    switch (this.section()) {
      case 'complete':
        return 'Confirmed and completed guest reservations.';
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
        return 'Confirmed and completed reservations will appear here.';
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
        return 'badge-completed';
      case 'cancelled':
        return 'badge-cancelled';
      default:
        return 'badge-inactive';
    }
  }
}
