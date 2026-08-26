import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import {
  RoomAvailability,
  RoomBlockedDate,
  mergeBlockedDatesIntoAvailability,
} from '../../core/models/room.model';
import { RoomApiService } from '../../core/services/room-api.service';

type DayStatus = 'empty' | 'past' | 'pending' | 'available' | 'partial' | 'booked' | 'blocked';

interface CalendarDay {
  key: string | null;
  day: number;
  status: DayStatus;
  isToday: boolean;
  label?: string;
}

interface CalendarMonth {
  label: string;
  weeks: CalendarDay[][];
}

@Component({
  selector: 'app-room-availability-modal',
  standalone: true,
  imports: [],
  template: `
    <div class="overlay" (click)="closed.emit()">
      <div class="panel" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <header class="panel-header">
          <div>
            <h2>Availability</h2>
            <p>{{ roomTitle() }}</p>
          </div>
          <button type="button" class="close" (click)="closed.emit()" aria-label="Close">×</button>
        </header>

        <div class="panel-body">
          @if (error()) {
            <div class="alert alert-error">{{ error() }}</div>
          }
          @if (actionError()) {
            <div class="alert alert-error">{{ actionError() }}</div>
          }

          <div class="legend">
              <span><i class="dot available"></i> Available</span>
              <span><i class="dot booked"></i> Fully booked</span>
              <span><i class="dot blocked"></i> Blocked</span>
            </div>

          <section class="calendar" [class.calendar-loading]="loading()">
            <div class="month-nav">
                <button type="button" class="nav-btn" (click)="prevMonth()" [disabled]="!canGoPrev()" aria-label="Previous month">
                  ‹
                </button>
                <h3>{{ currentMonth().label }}</h3>
                <button type="button" class="nav-btn" (click)="nextMonth()" [disabled]="!canGoNext()" aria-label="Next month">
                  ›
                </button>
              </div>

              <div class="weekdays">
                @for (day of weekdayLabels; track day) {
                  <span>{{ day }}</span>
                }
              </div>
              @for (week of currentMonth().weeks; track $index) {
                <div class="week">
                  @for (cell of week; track $index) {
                    @if (cell.key) {
                      <button
                        type="button"
                        class="day"
                        [class.available]="displayStatus(cell) === 'available'"
                        [class.partial]="displayStatus(cell) === 'partial'"
                        [class.booked]="displayStatus(cell) === 'booked'"
                        [class.blocked]="displayStatus(cell) === 'blocked'"
                        [class.past]="displayStatus(cell) === 'past'"
                        [class.pending]="displayStatus(cell) === 'pending'"
                        [class.selected]="displayStatus(cell) === 'selected'"
                        [class.clickable]="isDayClickable(cell)"
                        [disabled]="!isDayClickable(cell)"
                        [title]="dayTitle(cell)"
                        (click)="onDayClick(cell)"
                      >
                        {{ cell.label ?? cell.day }}
                      </button>
                    } @else {
                      <span class="day empty"></span>
                    }
                  }
                </div>
              }
          </section>

          <section class="update-section">
            <div class="update-actions">
              @if (hasChanges()) {
                <button type="button" class="btn btn-sm" (click)="resetSelection()">Reset</button>
              }
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="loading() || !hasChanges() || saving()"
                (click)="updateAvailability()"
              >
                {{ saving() ? 'Updating…' : 'Update availability' }}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(26, 43, 60, 0.35);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: fadeIn 0.2s ease;
    }

    .panel {
      width: 100%;
      max-width: 460px;
      max-height: 92vh;
      overflow: auto;
      background: var(--white);
      border-radius: var(--radius);
      box-shadow: var(--shadow-md);
    }

    .panel-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-light);
      position: sticky;
      top: 0;
      background: var(--white);
      z-index: 1;
    }

    .panel-header h2 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .panel-header p {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .close {
      width: 32px;
      height: 32px;
      border: none;
      background: var(--primary-soft);
      color: var(--primary-dark);
      border-radius: var(--radius-sm);
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      flex-shrink: 0;
    }

    .panel-body {
      padding: 1.25rem 1.5rem 1.5rem;
    }

    @keyframes shimmer {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }

    .calendar-loading .day.pending {
      animation: shimmer 1.2s ease-in-out infinite;
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1rem;
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
      border-radius: 2px;
      display: inline-block;
    }

    .dot.available {
      background: #e6f4ed;
      border: 1px solid var(--success);
    }

    .dot.booked {
      background: #fdeaea;
      border: 1px solid var(--danger);
    }

    .dot.blocked {
      background: #ffedd5;
      border: 1px solid #f97316;
    }

    .update-section {
      margin-top: 1.25rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-light);
    }

    .update-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .calendar {
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      padding: 1rem;
      margin-bottom: 1.25rem;
    }

    .month-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .month-nav h3 {
      margin: 0;
      flex: 1;
      text-align: center;
      font-size: 1rem;
      font-weight: 700;
    }

    .nav-btn {
      width: 36px;
      height: 36px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--white);
      font-size: 1.25rem;
      cursor: pointer;
    }

    .nav-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .weekdays,
    .week {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }

    .weekdays {
      margin-bottom: 4px;
    }

    .weekdays span {
      text-align: center;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .day {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8125rem;
      font-weight: 600;
      border-radius: 6px;
      background: var(--primary-muted);
      color: var(--text-muted);
      border: none;
      padding: 0;
      font-family: inherit;
    }

    .day.clickable {
      cursor: pointer;
    }

    .day.clickable:hover:not(:disabled) {
      filter: brightness(0.97);
      transform: scale(1.04);
    }

    .day:disabled {
      cursor: default;
    }

    .day.selected {
      background: var(--primary-soft);
      color: var(--primary-dark);
      box-shadow: inset 0 0 0 2px var(--primary-dark);
    }

    .day.empty {
      background: transparent;
    }

    .day.available {
      background: #e6f4ed;
      color: var(--success);
    }

    .day.partial {
      background: #fff8e6;
      color: #b8860b;
      font-size: 0.6875rem;
    }

    .day.booked {
      background: #fdeaea;
      color: var(--danger);
    }

    .day.blocked {
      background: #ffedd5;
      color: #c2410c;
      box-shadow: inset 0 0 0 1px #fb923c;
    }

    .day.past {
      background: #f4f6f8;
      color: var(--text-muted);
    }

    .day.pending {
      background: var(--primary-muted);
      color: var(--text-muted);
      font-weight: 500;
    }

    @media (max-width: 640px) {
      .overlay {
        padding: 0.75rem;
        align-items: flex-end;
      }

      .panel-header,
      .panel-body {
        padding-left: 1rem;
        padding-right: 1rem;
      }

      .calendar {
        padding: 0.75rem 0.5rem;
      }

      .weekdays,
      .week {
        gap: 2px;
      }

      .weekdays span {
        font-size: 0.5625rem;
      }

      .day {
        font-size: 0.6875rem;
        border-radius: 4px;
      }

      .day.partial {
        font-size: 0.5625rem;
      }

      .update-actions {
        flex-direction: column-reverse;
        align-items: stretch;
      }

      .update-actions .btn {
        width: 100%;
      }
    }

  `,
})
export class RoomAvailabilityModalComponent implements OnInit {
  private readonly roomApi = inject(RoomApiService);

  readonly idOrSlug = input.required<string>();
  readonly roomTitle = input.required<string>();
  readonly roomQuantity = input(1);
  readonly closed = output<void>();
  readonly updated = output<void>();

  protected readonly weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly availability = signal<RoomAvailability | null>(null);
  protected readonly viewMonth = signal(monthIndex(new Date()));
  protected readonly selectedDates = signal<Set<string>>(new Set());

  protected readonly blockedList = computed(() => this.availability()?.blocked ?? []);

  protected readonly hasChanges = computed(() => {
    const availability = this.availability();
    if (!availability) return false;
    const serverBlocked = new Set(availability.blockedDates ?? []);
    const selected = this.selectedDates();
    if (serverBlocked.size !== selected.size) return true;
    for (const date of serverBlocked) {
      if (!selected.has(date)) return true;
    }
    return false;
  });

  protected readonly monthBounds = computed(() => {
    const today = startOfDay(new Date());
    return {
      min: monthIndex(today),
      max: monthIndex(addDays(today, 365)),
    };
  });

  protected readonly currentMonth = computed(() => {
    const availability = this.availability();
    const view = this.viewMonth();
    const today = startOfDay(new Date());
    const todayKey = dateKey(today);

    return buildMonth(
      monthFromIndex(view),
      availability ? new Set(availability.bookedDates) : new Set(),
      availability ? new Set(availability.blockedDates ?? []) : new Set(),
      availability ? new Set(availability.availableDates) : new Set(),
      availability?.occupancyByDate ?? {},
      availability?.room.quantity ?? this.roomQuantity(),
      today,
      todayKey,
      availability != null,
    );
  });

  protected readonly canGoPrev = computed(() => this.viewMonth() > this.monthBounds().min);
  protected readonly canGoNext = computed(() => this.viewMonth() < this.monthBounds().max);

  ngOnInit(): void {
    this.loadAll();
  }

  prevMonth(): void {
    if (this.canGoPrev()) this.viewMonth.update((m) => m - 1);
  }

  nextMonth(): void {
    if (this.canGoNext()) this.viewMonth.update((m) => m + 1);
  }

  protected isDayClickable(cell: CalendarDay): boolean {
    if (this.loading()) return false;
    return cell.status !== 'booked' && cell.status !== 'past' && cell.status !== 'empty' && cell.status !== 'pending';
  }

  protected isDateSelected(key: string | null): boolean {
    return key != null && this.selectedDates().has(key);
  }

  protected isServerBlocked(key: string | null): boolean {
    if (!key) return false;
    return (this.availability()?.blockedDates ?? []).includes(key);
  }

  protected displayStatus(cell: CalendarDay): DayStatus | 'selected' {
    if (!cell.key) return 'empty';
    if (cell.status === 'booked') return 'booked';

    if (this.isDateSelected(cell.key)) {
      return this.isServerBlocked(cell.key) ? 'blocked' : 'selected';
    }

    if (this.isServerBlocked(cell.key)) return 'available';
    return cell.status;
  }

  protected dayTitle(cell: CalendarDay): string {
    if (!this.isDayClickable(cell)) {
      if (cell.status === 'booked') return 'Fully booked';
      return cell.label || cell.key || '';
    }
    if (this.isDateSelected(cell.key)) {
      return this.isServerBlocked(cell.key) ? 'Blocked — click to deselect' : 'Selected — click to deselect';
    }
    if (this.isServerBlocked(cell.key)) return 'Unselected blocked date — click to keep blocked';
    return 'Click to select';
  }

  onDayClick(cell: CalendarDay): void {
    if (!cell.key || !this.isDayClickable(cell)) return;

    this.selectedDates.update((dates) => {
      const next = new Set(dates);
      if (next.has(cell.key!)) next.delete(cell.key!);
      else next.add(cell.key!);
      return next;
    });
    this.actionError.set(null);
  }

  resetSelection(): void {
    this.syncSelectedFromAvailability();
    this.actionError.set(null);
  }

  updateAvailability(): void {
    if (!this.hasChanges() || this.saving()) return;

    const availability = this.availability();
    if (!availability) return;

    const serverBlocked = new Set(availability.blockedDates ?? []);
    const selected = this.selectedDates();
    const toBlock = [...selected].filter((date) => !serverBlocked.has(date)).sort();
    const toUnblock = [...serverBlocked].filter((date) => !selected.has(date)).sort();

    const removeRequests = toUnblock
      .map((date) => this.findBlockForDate(date))
      .filter((block): block is RoomBlockedDate => block != null)
      .map((block) => this.roomApi.removeBlockedDate(this.idOrSlug(), block._id));

    this.saving.set(true);
    this.actionError.set(null);

    const removes$ = removeRequests.length ? forkJoin(removeRequests) : of([]);

    removes$
      .pipe(
        switchMap(() => {
          if (toBlock.length === 0) return of(null);
          return this.roomApi.addBlockedDates(this.idOrSlug(), {
            blocks: toBlock.map((date) => ({ startDate: date, endDate: date })),
          });
        }),
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.updated.emit();
        },
        error: (err) => {
          this.actionError.set(extractApiError(err, 'Failed to update availability.'));
          this.saving.set(false);
        },
      });
  }

  private findBlockForDate(key: string): RoomBlockedDate | undefined {
    return this.blockedList().find((block) => {
      const start = block.startDate.slice(0, 10);
      const end = (block.endDate ?? block.startDate).slice(0, 10);
      return key >= start && key <= end;
    });
  }

  private syncSelectedFromAvailability(): void {
    const availability = this.availability();
    if (!availability) {
      this.selectedDates.set(new Set());
      return;
    }
    this.selectedDates.set(new Set(availability.blockedDates ?? []));
  }

  private loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    const idOrSlug = this.idOrSlug();
    const roomContext = {
      title: this.roomTitle(),
      quantity: this.roomQuantity(),
    };

    forkJoin({
      availability: this.roomApi.getAvailability(idOrSlug, roomContext),
      blocked: this.roomApi.getBlockedDates(idOrSlug).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ availability, blocked }) => {
        this.availability.set(mergeBlockedDatesIntoAvailability(availability, blocked));
        this.syncSelectedFromAvailability();
        this.viewMonth.set(monthIndex(new Date()));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiError(err, 'Failed to load availability.'));
        this.loading.set(false);
      },
    });
  }

  private reloadAvailability(): void {
    const idOrSlug = this.idOrSlug();
    const roomContext = {
      title: this.roomTitle(),
      quantity: this.roomQuantity(),
    };

    forkJoin({
      availability: this.roomApi.getAvailability(idOrSlug, roomContext),
      blocked: this.roomApi.getBlockedDates(idOrSlug).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ availability, blocked }) => {
        this.availability.set(mergeBlockedDatesIntoAvailability(availability, blocked));
        this.syncSelectedFromAvailability();
      },
      error: (err) => {
        this.actionError.set(extractApiError(err, 'Failed to refresh availability.'));
      },
    });
  }
}

function extractApiError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'error' in err) {
    const apiErr = (err as { error?: { message?: string } }).error;
    if (apiErr?.message) return apiErr.message;
  }
  return fallback;
}

function monthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

function monthFromIndex(index: number): Date {
  return new Date(Math.floor(index / 12), index % 12, 1);
}

function buildMonth(
  monthStart: Date,
  bookedSet: Set<string>,
  blockedSet: Set<string>,
  availableSet: Set<string>,
  occupancyByDate: Record<string, { bookedCount: number; availableUnits: number; quantity: number; blocked: boolean }>,
  roomQuantity: number,
  today: Date,
  todayKey: string,
  dataLoaded: boolean,
): CalendarMonth {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: CalendarDay[] = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ key: null, day: 0, status: 'empty', isToday: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const occupancy = occupancyByDate[key];
    let status: DayStatus;
    let label: string | undefined;

    if (date < today) {
      status = 'past';
    } else if (blockedSet.has(key) || occupancy?.blocked) {
      status = 'blocked';
    } else if (bookedSet.has(key) || (occupancy && occupancy.availableUnits <= 0 && occupancy.bookedCount > 0)) {
      status = 'booked';
    } else if (!dataLoaded) {
      status = 'pending';
    } else if (
      occupancy &&
      occupancy.bookedCount > 0 &&
      occupancy.availableUnits > 0 &&
      occupancy.availableUnits < occupancy.quantity
    ) {
      status = 'partial';
      label = `${occupancy.availableUnits}/${occupancy.quantity}`;
    } else {
      status = 'available';
    }

    cells.push({ key, day, status, isToday: key === todayKey, label });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: null, day: 0, status: 'empty', isToday: false });
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

function parseDateKey(value: string): Date {
  const iso = value.includes('T') ? value.slice(0, 10) : value;
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
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

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
