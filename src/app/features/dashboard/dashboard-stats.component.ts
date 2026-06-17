import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BookingApiService } from '../../core/services/booking-api.service';

@Component({
  selector: 'app-dashboard-stats',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    @if (loading()) {
      <div class="stats-loading">
        @for (item of [1, 2, 3]; track item) {
          <div class="skeleton-card"></div>
        }
      </div>
    } @else {
      <section class="stats-strip">
        <article class="stat-card card bookings">
          <div class="stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <rect x="4" y="5" width="16" height="15" rx="2" />
              <path d="M8 3v4M16 3v4M4 10h16" />
            </svg>
          </div>
          <div class="stat-copy">
            <p class="stat-label">Rooms Booking</p>
            <p class="stat-value">{{ stats().totalBookings }}</p>
          </div>
        </article>

        <article class="stat-card card cancelled">
          <div class="stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <circle cx="12" cy="12" r="8" />
              <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
            </svg>
          </div>
          <div class="stat-copy">
            <p class="stat-label">Rooms Cancelled</p>
            <p class="stat-value muted">{{ stats().cancelledBookings }}</p>
          </div>
        </article>

        <article class="stat-card card revenue">
          <div class="stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <rect x="3" y="7" width="18" height="12" rx="2" />
              <path d="M3 11h18" />
              <path d="M7 15h2" />
            </svg>
          </div>
          <div class="stat-copy">
            <p class="stat-label">Total Revenue</p>
            <p class="stat-value revenue">
              {{ stats().totalRevenue | currency: 'GHS':'symbol':'1.2-2' }}
            </p>
          </div>
        </article>
      </section>
    }
  `,
  styles: `
    .stats-strip,
    .stats-loading {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.35rem 1.5rem;
      border-left: 4px solid transparent;
      min-height: 6.5rem;
    }

    .stat-card.bookings { border-left-color: #2563eb; }
    .stat-card.cancelled { border-left-color: #94a3b8; }
    .stat-card.revenue { border-left-color: #16a34a; }

    .stat-icon {
      width: 3rem;
      height: 3rem;
      border-radius: 0.75rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon svg {
      width: 1.5rem;
      height: 1.5rem;
    }

    .bookings .stat-icon {
      background: #dbeafe;
      color: #2563eb;
    }

    .cancelled .stat-icon {
      background: #f1f5f9;
      color: #64748b;
    }

    .revenue .stat-icon {
      background: #dcfce7;
      color: #16a34a;
    }

    .stat-copy {
      min-width: 0;
    }

    .stat-label {
      margin: 0 0 0.35rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .stat-value {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.02em;
      color: var(--text);
      word-break: break-word;
    }

    .stat-value.muted {
      color: #94a3b8;
    }

    .stat-value.revenue {
      color: #16a34a;
      font-size: 1.5rem;
    }

    .skeleton-card {
      min-height: 6.5rem;
      border-radius: var(--radius);
      background: linear-gradient(
        90deg,
        var(--primary-muted) 25%,
        var(--primary-soft) 50%,
        var(--primary-muted) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.2s ease-in-out infinite;
    }

    @keyframes shimmer {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }

    @media (max-width: 960px) {
      .stats-strip,
      .stats-loading {
        grid-template-columns: 1fr;
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
