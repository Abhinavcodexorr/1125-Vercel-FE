import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BookingApiService } from '../../core/services/booking-api.service';

@Component({
  selector: 'app-dashboard-stats',
  standalone: true,
  imports: [AppCurrencyPipe],
  template: `
    @if (loading()) {
      <section class="panel" aria-hidden="true">
        <div class="skel-head"></div>
        <div class="skel-row">
          @for (item of [1, 2, 3, 4, 5]; track item) {
            <div class="skel-cell"></div>
          }
        </div>
      </section>
    } @else {
      <section class="panel" aria-label="Booking statistics">
        <header class="panel-head">
          <h2>Overview</h2>
        </header>

        <div class="row">
          <article class="stat revenue">
            <p class="label">Total revenue</p>
            <p class="value">{{ stats().totalRevenue | appCurrency: 'GHS' }}</p>
          </article>

          <article class="stat">
            <p class="label">Total bookings</p>
            <p class="value">{{ stats().totalBookings }}</p>
          </article>

          <article class="stat pending">
            <p class="label">Pending</p>
            <p class="value">{{ stats().pendingBookings }}</p>
          </article>

          <article class="stat complete">
            <p class="label">Complete</p>
            <p class="value">{{ stats().completedBookings }}</p>
          </article>

          <article class="stat cancelled">
            <p class="label">Cancelled</p>
            <p class="value">{{ stats().cancelledBookings }}</p>
          </article>
        </div>
      </section>
    }
  `,
  styles: `
    .panel {
      margin-bottom: 1.5rem;
      padding: 1.35rem 1.5rem 1.15rem;
      background: var(--white);
      border: 1px solid var(--border-light);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
    }

    .panel-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .panel-head h2 {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.02em;
    }

    .row {
      display: grid;
      grid-template-columns: 1.3fr repeat(4, minmax(0, 1fr));
      gap: 0;
      align-items: start;
    }

    .stat {
      padding: 0 0.9rem 0 1rem;
      border-left: 1px solid var(--border-light);
      min-width: 0;
    }

    .stat:first-child {
      padding-left: 0;
      border-left: none;
    }

    .label {
      margin: 0 0 0.4rem;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .value {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.035em;
      line-height: 1.1;
      color: var(--text);
    }

    .revenue .value {
      font-size: 1.6rem;
      color: var(--btn-primary-bg);
    }

    .pending .value { color: var(--warning); }
    .complete .value { color: var(--success); }
    .cancelled .value { color: var(--danger); }

    .skel-head {
      width: 12rem;
      height: 2.4rem;
      margin-bottom: 1.25rem;
      border-radius: 8px;
      background: linear-gradient(90deg, var(--primary-muted) 25%, var(--primary-soft) 50%, var(--primary-muted) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.2s ease-in-out infinite;
    }

    .skel-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1rem;
    }

    .skel-cell {
      height: 4.5rem;
      border-radius: 8px;
      background: linear-gradient(90deg, var(--primary-muted) 25%, var(--primary-soft) 50%, var(--primary-muted) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.2s ease-in-out infinite;
    }

    @keyframes shimmer {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }

    @media (max-width: 720px) {
      .row {
        grid-template-columns: 1fr 1fr;
        gap: 0.9rem 0;
      }

      .stat {
        border-left: none;
        padding: 0.75rem 0.5rem 0.15rem 0;
        border-top: 1px solid var(--border-light);
      }

      .stat.revenue {
        grid-column: 1 / -1;
        border-top: none;
        padding-top: 0;
        padding-bottom: 0.85rem;
        border-bottom: 1px solid var(--border-light);
        margin-bottom: 0.15rem;
      }

      .stat:nth-child(2),
      .stat:nth-child(3) {
        border-top: none;
        padding-top: 0.15rem;
      }

      .revenue .value,
      .value {
        font-size: 1.45rem;
      }
    }

    @media (max-width: 640px) {
      .panel {
        padding: 1.15rem 1rem 1rem;
      }
    }
  `,
})
export class DashboardStatsComponent implements OnInit {
  private readonly bookingApi = inject(BookingApiService);

  protected readonly loading = signal(true);

  protected readonly stats = computed(() => {
    const statistics = this.bookingApi.statistics();

    return {
      totalBookings: statistics?.totalBookings ?? 0,
      pendingBookings: statistics?.pendingBookings ?? 0,
      completedBookings: statistics?.completedBookings ?? 0,
      cancelledBookings: statistics?.cancelledBookings ?? 0,
      totalRevenue: statistics?.totalRevenue ?? 0,
    };
  });

  ngOnInit(): void {
    this.bookingApi
      .loadStatistics()
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: () => this.loading.set(false),
        error: () => this.loading.set(false),
      });
  }
}
