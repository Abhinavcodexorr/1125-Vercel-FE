import { DatePipe } from '@angular/common';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import {
  BookingCalendarEntry,
  isPaidCalendarBooking,
} from '../../core/models/booking.model';
import { BookingApiService } from '../../core/services/booking-api.service';
import { DashboardStatsComponent } from './dashboard-stats.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

type DayStatus = 'empty' | 'past' | 'available' | 'booked';

interface CalendarDay {
  key: string | null;
  day: number;
  status: DayStatus;
  isToday: boolean;
  bookingCount: number;
}

interface CalendarMonth {
  label: string;
  weeks: CalendarDay[][];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [PageHeaderComponent, AppCurrencyPipe, DatePipe, DashboardStatsComponent],
  template: `
    <app-page-header
      title="Dashboard"
      subtitle="Booking overview"
    />

    <app-dashboard-stats />

    <section class="card calendar-panel">
      <div class="calendar-top">
        <div>
          <h2>Booking calendar</h2>
          <p class="calendar-sub">Paid bookings — click a highlighted date for guest details</p>
        </div>
        <div class="calendar-actions">
          <span class="month-chip">{{ monthBookedDays() }} booked days</span>
        </div>
      </div>

      <div class="calendar-shell">
        <div class="month-nav">
          <button type="button" class="nav-btn" (click)="prevCalendarMonth()" aria-label="Previous month">‹</button>
          <span class="month-label">{{ calendarMonth().label }}</span>
          <button type="button" class="nav-btn" (click)="nextCalendarMonth()" aria-label="Next month">›</button>
        </div>

        <div class="legend">
          <span><i class="dot available"></i> Available</span>
          <span><i class="dot booked"></i> Booked</span>
        </div>

        @if (calendarLoading()) {
          <div class="calendar-loading" aria-hidden="true">
            @for (row of [1, 2, 3, 4, 5]; track row) {
              <div class="skeleton-row"></div>
            }
          </div>
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
                  <button
                    type="button"
                    class="day"
                    [class.available]="cell.status === 'available'"
                    [class.past]="cell.status === 'past'"
                    [class.booked]="cell.status === 'booked'"
                    [class.today]="cell.isToday"
                    [class.selected]="selectedDate() === cell.key"
                    [disabled]="cell.status !== 'booked'"
                    (click)="onDayClick(cell)"
                  >
                    <span class="day-num">{{ cell.day }}</span>
                    @if (cell.bookingCount > 1) {
                      <span class="day-count">{{ cell.bookingCount }}</span>
                    }
                  </button>
                } @else {
                  <span class="day empty"></span>
                }
              }
            </div>
          }
        }
      </div>
    </section>

    @if (selectedDate(); as date) {
      <div class="overlay" (click)="clearSelectedDate()">
        <div class="popup" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <header class="popup-header">
            <div>
              <p class="popup-kicker">Bookings</p>
              <h3>{{ parseDateKey(date) | date: 'EEEE, MMM d, y' }}</h3>
              <p class="popup-meta">
                {{ selectedDayBookings().length }}
                guest{{ selectedDayBookings().length === 1 ? '' : 's' }}
              </p>
            </div>
            <button type="button" class="close-btn" (click)="clearSelectedDate()" aria-label="Close">×</button>
          </header>

          @if (selectedDayBookings().length === 0) {
            <p class="muted popup-empty">No paid bookings on this date.</p>
          } @else {
            <ul class="guest-list">
              @for (b of selectedDayBookings(); track b.id) {
                <li [class.expanded]="expandedBookingId() === b.id">
                  <button type="button" class="guest-row" (click)="toggleBooking(b.id)">
                    <span class="guest-avatar">{{ guestInitials(b.roomTitle) }}</span>
                    <span class="guest-summary">
                      <span class="guest-name">{{ b.roomTitle }}</span>
                      <span class="guest-room">{{ b.cabinType || b.title || '—' }}</span>
                    </span>
                    <span class="chevron" [class.open]="expandedBookingId() === b.id">›</span>
                  </button>
                  <div class="guest-detail-wrap" [class.expanded]="expandedBookingId() === b.id">
                    <div class="guest-detail-inner">
                      <dl class="detail-grid">
                        <div class="detail-item">
                          <dt>Room</dt>
                          <dd>
                            {{ b.roomTitle }}
                            @if (b.cabinType || b.title) {
                              ({{ b.cabinType || b.title }})
                            }
                          </dd>
                        </div>
                        @if (b.bookingReference) {
                          <div class="detail-item">
                            <dt>Reference</dt>
                            <dd>{{ b.bookingReference }}</dd>
                          </div>
                        }
                        @if (b.cabinType) {
                          <div class="detail-item">
                            <dt>Type</dt>
                            <dd>{{ b.cabinType }}</dd>
                          </div>
                        }
                        @if (b.guestEmail) {
                          <div class="detail-item">
                            <dt>Email</dt>
                            <dd>{{ b.guestEmail }}</dd>
                          </div>
                        }
                        @if (b.guestMobile) {
                          <div class="detail-item">
                            <dt>Phone</dt>
                            <dd>{{ b.guestMobile }}</dd>
                          </div>
                        }
                        <div class="detail-item">
                          <dt>Stay</dt>
                          <dd>
                            {{ b.checkIn | date: 'MMM d, y' }} – {{ b.checkOut | date: 'MMM d, y' }}
                          </dd>
                        </div>
                        @if (b.adults != null) {
                          <div class="detail-item">
                            <dt>Guests</dt>
                            <dd>
                              {{ b.adults }} adult{{ b.adults === 1 ? '' : 's' }}
                              @if (b.children) {
                                , {{ b.children }} child{{ b.children === 1 ? '' : 'ren' }}
                              }
                            </dd>
                          </div>
                        }
                        @if (b.totalAmount != null) {
                          <div class="detail-item detail-amount">
                            <dt>Amount</dt>
                            <dd>
                              {{ b.totalAmount | appCurrency: b.currency }}
                              <span class="paid-badge">Paid</span>
                            </dd>
                          </div>
                        }
                      </dl>
                    </div>
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .muted {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .calendar-panel {
      padding: 1.5rem;
    }

    .calendar-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .calendar-top h2 {
      margin: 0 0 0.25rem;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .calendar-sub {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .calendar-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .month-chip {
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      background: #fde8e8;
      color: #b42318;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .calendar-shell {
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      padding: 1.125rem;
      background: linear-gradient(180deg, var(--white) 0%, var(--primary-muted) 100%);
    }

    .month-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .month-label {
      min-width: 10rem;
      text-align: center;
      font-weight: 700;
      font-size: 1rem;
      color: var(--text);
    }

    .nav-btn {
      width: 36px;
      height: 36px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--white);
      cursor: pointer;
      font-size: 1.25rem;
      line-height: 1;
      color: var(--text-secondary);
      transition: background-color 0.18s ease, border-color 0.18s ease;
    }

    .nav-btn:hover {
      background: var(--primary-soft);
      border-color: var(--primary-light);
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.25rem;
      margin-bottom: 1rem;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .legend span {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 3px;
      display: inline-block;
    }

    .dot.available {
      background: #e6f4ed;
      border: 1px solid var(--success);
    }

    .dot.booked {
      background: #fde8e8;
      border: 1px solid var(--danger);
    }

    .dot.today {
      background: var(--primary-soft);
      border: 2px solid var(--primary);
    }

    .calendar-loading {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .skeleton-row {
      height: 2.75rem;
      border-radius: var(--radius-sm);
      background: linear-gradient(90deg, var(--primary-muted) 25%, var(--primary-soft) 50%, var(--primary-muted) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.2s ease-in-out infinite;
    }

    @keyframes shimmer {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }

    .weekdays,
    .week {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.375rem;
    }

    .weekdays {
      margin-bottom: 0.5rem;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-muted);
      text-align: center;
    }

    .week {
      margin-bottom: 0.375rem;
    }

    .day {
      position: relative;
      min-height: 2.75rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.125rem;
      border-radius: 10px;
      font-size: 0.875rem;
      background: transparent;
      color: var(--text);
      border: 1px solid transparent;
      padding: 0.25rem;
      font-family: inherit;
      font-weight: 600;
      transition: background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
    }

    .day.available {
      background: transparent;
      color: var(--text);
    }

    .day.past {
      background: #f0f3f6;
      color: var(--text-muted);
      font-weight: 500;
    }

    .day.booked {
      background: #fde8e8;
      color: #b42318;
      cursor: pointer;
      border-color: #f5c4c4;
    }

    .day.booked:hover {
      background: #f9d4d4;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(180, 35, 24, 0.12);
    }

    .day.selected {
      box-shadow: inset 0 0 0 2px #b42318;
    }

    .day:disabled {
      cursor: default;
    }

    .day.today:not(.booked) {
      box-shadow: inset 0 0 0 2px var(--primary);
    }

    .day.today.booked {
      box-shadow: inset 0 0 0 2px var(--primary), 0 0 0 1px #f5c4c4;
    }

    .day.empty {
      background: transparent;
      border: none;
      min-height: 2.75rem;
    }

    .day-num {
      line-height: 1;
    }

    .day-count {
      font-size: 0.5625rem;
      line-height: 1;
      padding: 0.1rem 0.3rem;
      border-radius: 999px;
      background: #b42318;
      color: var(--white);
    }

    .overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(26, 43, 60, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: overlayIn 0.22s ease-out both;
    }

    .popup {
      width: 100%;
      max-width: 400px;
      max-height: min(80vh, 520px);
      overflow: auto;
      background: var(--white);
      border-radius: var(--radius);
      box-shadow: var(--shadow-md);
      animation: popupIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
      transform-origin: center center;
      contain: layout style;
      -webkit-overflow-scrolling: touch;
    }

    .popup-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.25rem 1.25rem 1rem;
      border-bottom: 1px solid var(--border-light);
      background: linear-gradient(180deg, var(--primary-muted) 0%, var(--white) 100%);
    }

    .popup-kicker {
      margin: 0 0 0.2rem;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--primary-dark);
    }

    .popup-header h3 {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1.3;
    }

    .popup-meta {
      margin: 0.35rem 0 0;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .popup-empty {
      padding: 1.5rem 1.25rem;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      background: var(--white);
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      color: var(--text-secondary);
    }

    .close-btn:hover {
      background: var(--primary-muted);
    }

    .guest-list {
      list-style: none;
      margin: 0;
      padding: 0.5rem 0;
    }

    .guest-list li {
      border-bottom: 1px solid var(--border-light);
      transition: background-color 0.18s ease;
    }

    .guest-list li.expanded {
      background: var(--primary-muted);
    }

    .guest-list li:last-child {
      border-bottom: none;
    }

    .guest-row {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1.25rem;
      border: none;
      background: transparent;
      cursor: pointer;
      font-family: inherit;
      text-align: left;
      transition: background-color 0.18s ease;
    }

    .guest-row:hover {
      background: rgba(124, 165, 200, 0.08);
    }

    .guest-avatar {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      border-radius: 50%;
      background: var(--primary-soft);
      color: var(--primary-dark);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8125rem;
      font-weight: 700;
    }

    .guest-summary {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .guest-room {
      font-size: 0.75rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .guest-detail-wrap {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 0.26s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .guest-detail-wrap.expanded {
      grid-template-rows: 1fr;
    }

    .guest-detail-inner {
      overflow: hidden;
      min-height: 0;
    }

    .guest-name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text);
    }

    .chevron {
      font-size: 1.125rem;
      color: var(--text-muted);
      transition: transform var(--transition);
    }

    .chevron.open {
      transform: rotate(90deg);
    }

    .detail-grid {
      margin: 0;
      padding: 0 1.25rem 1rem 4.4rem;
      display: grid;
      gap: 0.625rem;
    }

    .detail-item {
      display: grid;
      grid-template-columns: 5rem 1fr;
      gap: 0.5rem;
      align-items: start;
    }

    .detail-item dt {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .detail-item dd {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--text);
      line-height: 1.4;
      word-break: break-word;
    }

    .detail-amount dd {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      font-weight: 700;
    }

    .paid-badge {
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: #e6f4ed;
      color: var(--success);
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    @keyframes overlayIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes popupIn {
      from {
        opacity: 0;
        transform: translate3d(0, 10px, 0) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .overlay,
      .popup,
      .guest-detail-wrap,
      .chevron,
      .guest-row,
      .day.booked {
        animation: none !important;
        transition: none !important;
      }
    }

    @media (max-width: 1100px) {
      .calendar-top {
        flex-direction: column;
      }

      .detail-grid {
        padding-left: 1.25rem;
      }

      .detail-item {
        grid-template-columns: 1fr;
        gap: 0.15rem;
      }
    }
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly bookingApi = inject(BookingApiService);

  protected readonly weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  protected readonly calendarLoading = signal(true);
  protected readonly calendarBookings = signal<BookingCalendarEntry[]>([]);
  protected readonly selectedDate = signal<string | null>(null);
  protected readonly expandedBookingId = signal<string | null>(null);
  private readonly calendarViewMonth = signal(monthIndex(new Date()));

  protected readonly paidCalendarBookings = computed(() =>
    this.calendarBookings().filter(isPaidCalendarBooking),
  );

  protected readonly calendarMonth = computed(() =>
    buildCalendarMonth(monthFromIndex(this.calendarViewMonth()), this.paidCalendarBookings()),
  );

  protected readonly selectedDayBookings = computed(() => {
    const date = this.selectedDate();
    if (!date) return [];
    return getBookingsForDate(date, this.paidCalendarBookings());
  });

  protected readonly monthBookedDays = computed(() => {
    const booked = new Set<string>();
    const monthStart = monthFromIndex(this.calendarViewMonth());
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const key = dateKey(new Date(year, month, day));
      if (getBookingsForDate(key, this.paidCalendarBookings()).length > 0) {
        booked.add(key);
      }
    }
    return booked.size;
  });

  ngOnInit(): void {
    this.loadCalendar();
  }

  prevCalendarMonth(): void {
    this.calendarViewMonth.update((month) => month - 1);
    this.clearSelectedDate();
  }

  nextCalendarMonth(): void {
    this.calendarViewMonth.update((month) => month + 1);
    this.clearSelectedDate();
  }

  goToToday(): void {
    this.calendarViewMonth.set(monthIndex(new Date()));
    this.clearSelectedDate();
  }

  protected guestInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  protected parseDateKey(key: string): Date {
    return parseDate(key);
  }

  ngOnDestroy(): void {
    this.setBodyScrollLocked(false);
  }

  onDayClick(cell: CalendarDay): void {
    if (!cell.key || cell.status !== 'booked') return;
    this.selectedDate.set(cell.key);
    this.expandedBookingId.set(null);
    this.setBodyScrollLocked(true);
  }

  toggleBooking(id: string): void {
    this.expandedBookingId.update((current) => (current === id ? null : id));
  }

  clearSelectedDate(): void {
    this.selectedDate.set(null);
    this.expandedBookingId.set(null);
    this.setBodyScrollLocked(false);
  }

  private setBodyScrollLocked(locked: boolean): void {
    document.body.style.overflow = locked ? 'hidden' : '';
  }

  private loadCalendar(): void {
    this.calendarLoading.set(true);
    this.bookingApi
      .loadCalendar()
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

function getBookingsForDate(dateKey: string, entries: BookingCalendarEntry[]): BookingCalendarEntry[] {
  const date = startOfDay(parseDate(dateKey));
  return entries.filter((entry) => {
    const checkIn = startOfDay(parseDate(entry.checkIn));
    const checkOut = startOfDay(parseDate(entry.checkOut));
    return date >= checkIn && date < checkOut;
  });
}

function buildCalendarMonth(monthStart: Date, entries: BookingCalendarEntry[]): CalendarMonth {
  const bookingCountByDay = new Map<string, number>();
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = startOfDay(new Date());
  const todayKey = dateKey(today);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const count = getBookingsForDate(key, entries).length;
    if (count > 0) bookingCountByDay.set(key, count);
  }

  const firstWeekday = new Date(year, month, 1).getDay();
  const cells: CalendarDay[] = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ key: null, day: 0, status: 'empty', isToday: false, bookingCount: 0 });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const bookingCount = bookingCountByDay.get(key) ?? 0;
    let status: DayStatus;

    if (bookingCount > 0) status = 'booked';
    else if (date < today) status = 'past';
    else status = 'available';

    cells.push({
      key,
      day,
      status,
      isToday: key === todayKey,
      bookingCount,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: null, day: 0, status: 'empty', isToday: false, bookingCount: 0 });
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
