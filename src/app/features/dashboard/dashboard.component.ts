import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { BookingCalendarEntry } from '../../core/models/booking.model';
import { BookingApiService } from '../../core/services/booking-api.service';
import { RoomApiService } from '../../core/services/room-api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

interface CalendarDay {
  key: string | null;
  day: number;
  booked: boolean;
  isToday: boolean;
}

interface CalendarMonth {
  label: string;
  weeks: CalendarDay[][];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [PageHeaderComponent],
  template: `
    <app-page-header
      title="Dashboard"
      subtitle="Overview of 1125 Beach Villa — rooms & bookings"
    />

    <div class="stats">
      @for (stat of statCards(); track stat.label) {
        <div class="stat card">
          <div class="stat-icon">{{ stat.icon }}</div>
          <div>
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      }
    </div>

    <section class="card panel calendar-panel">
      <div class="calendar-header">
        <h2>Booking calendar</h2>
        <div class="month-nav">
          <button type="button" class="nav-btn" (click)="prevCalendarMonth()" aria-label="Previous month">‹</button>
          <span class="month-label">{{ calendarMonth().label }}</span>
          <button type="button" class="nav-btn" (click)="nextCalendarMonth()" aria-label="Next month">›</button>
        </div>
      </div>

      @if (calendarLoading()) {
        <p class="muted">Loading calendar…</p>
      } @else {
        <div class="weekdays">
          @for (day of weekdayLabels; track day) {
            <span>{{ day }}</span>
          }
        </div>
        @for (week of calendarMonth().weeks; track $index) {
          <div class="week">
            @for (cell of week; track $index) {
              @if (cell.key) {
                <span class="day" [class.booked]="cell.booked" [class.today]="cell.isToday">{{ cell.day }}</span>
              } @else {
                <span class="day empty"></span>
              }
            }
          </div>
        }
      }
    </section>
  `,
  styles: `
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 1.125rem;
      padding: 1.375rem;
    }

    .stat-icon {
      width: 54px;
      height: 54px;
      background: var(--primary-soft);
      color: var(--primary-dark);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.375rem;
    }

    .stat-value {
      display: block;
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1.2;
    }

    .stat-label {
      font-size: 0.9375rem;
      color: var(--text-secondary);
    }

    .panel {
      padding: 1.5rem;
    }

    .muted {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .calendar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .calendar-header h2 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .month-nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .month-label {
      min-width: 9rem;
      text-align: center;
      font-weight: 600;
      font-size: 0.9375rem;
    }

    .nav-btn {
      width: 32px;
      height: 32px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      background: var(--white);
      cursor: pointer;
      font-size: 1.25rem;
      line-height: 1;
    }

    .nav-btn:hover {
      background: var(--primary-muted);
    }

    .weekdays,
    .week {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.25rem;
    }

    .weekdays {
      margin-bottom: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-align: center;
    }

    .week {
      margin-bottom: 0.25rem;
    }

    .day {
      height: 2.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      background: var(--primary-muted);
      color: var(--text-secondary);
    }

    .day.booked {
      background: #fde8e8;
      color: #b42318;
      font-weight: 600;
    }

    .day.today {
      outline: 2px solid var(--primary);
      outline-offset: -2px;
    }

    .day.empty {
      background: transparent;
    }

    @media (max-width: 1100px) {
      .stats {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `,
})
export class DashboardComponent implements OnInit {
  private readonly bookingApi = inject(BookingApiService);
  private readonly roomApi = inject(RoomApiService);

  protected readonly weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  protected readonly calendarLoading = signal(true);
  protected readonly roomCount = signal(0);
  protected readonly calendarBookings = signal<BookingCalendarEntry[]>([]);
  private readonly calendarViewMonth = signal(monthIndex(new Date()));

  protected readonly calendarMonth = computed(() =>
    buildCalendarMonth(monthFromIndex(this.calendarViewMonth()), this.calendarBookings()),
  );

  protected readonly statCards = computed(() => {
    const dashboard = this.bookingApi.dashboard();
    const statistics = this.bookingApi.statistics();
    const revenue = statistics?.totalRevenue ?? dashboard?.totalPayment ?? 0;

    return [
      {
        label: 'Active rooms',
        icon: '⌂',
        value: String(this.roomCount()),
      },
      {
        label: 'Total bookings',
        icon: '☰',
        value: String(statistics?.totalBookings ?? dashboard?.totalBookings ?? 0),
      },
      {
        label: 'Pending',
        icon: '…',
        value: String(statistics?.pendingBookings ?? 0),
      },
      {
        label: 'Paid / confirmed',
        icon: '✓',
        value: String(statistics?.confirmedBookings ?? 0),
      },
      {
        label: 'Cancelled',
        icon: '×',
        value: String(statistics?.cancelledBookings ?? dashboard?.cancelledBookings ?? 0),
      },
      {
        label: 'Revenue',
        icon: '$',
        value: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(revenue),
      },
    ];
  });

  ngOnInit(): void {
    forkJoin({
      rooms: this.roomApi.loadAll(true).pipe(catchError(() => of([]))),
      dashboard: this.bookingApi.loadDashboard().pipe(catchError(() => of(null))),
      statistics: this.bookingApi.loadStatistics().pipe(catchError(() => of(null))),
    }).subscribe(({ rooms }) => {
      this.roomCount.set(rooms.length);
    });

    this.loadCalendar();
  }

  prevCalendarMonth(): void {
    this.calendarViewMonth.update((month) => month - 1);
    this.loadCalendar();
  }

  nextCalendarMonth(): void {
    this.calendarViewMonth.update((month) => month + 1);
    this.loadCalendar();
  }

  private loadCalendar(): void {
    const monthStart = monthFromIndex(this.calendarViewMonth());
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const startDate = dateKey(monthStart);
    const endDate = dateKey(monthEnd);

    this.calendarLoading.set(true);
    this.bookingApi
      .loadCalendar(startDate, endDate)
      .pipe(
        catchError(() => of([] as BookingCalendarEntry[])),
        finalize(() => this.calendarLoading.set(false)),
      )
      .subscribe((entries) => this.calendarBookings.set(entries));
  }
}

function monthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

function monthFromIndex(index: number): Date {
  return new Date(Math.floor(index / 12), index % 12, 1);
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDate(value: string): Date {
  const iso = value.includes('T') ? value.slice(0, 10) : value;
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function buildCalendarMonth(monthStart: Date, entries: BookingCalendarEntry[]): CalendarMonth {
  const bookedDays = new Set<string>();
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dateKey(startOfDay(new Date()));

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    for (const entry of entries) {
      const checkIn = startOfDay(parseDate(entry.checkIn));
      const checkOut = startOfDay(parseDate(entry.checkOut));
      if (date >= checkIn && date < checkOut) {
        bookedDays.add(key);
        break;
      }
    }
  }

  const firstWeekday = new Date(year, month, 1).getDay();
  const cells: CalendarDay[] = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ key: null, day: 0, booked: false, isToday: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key = dateKey(new Date(year, month, day));
    cells.push({
      key,
      day,
      booked: bookedDays.has(key),
      isToday: key === todayKey,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: null, day: 0, booked: false, isToday: false });
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return {
    label: monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    weeks,
  };
}
