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
          <div class="header-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
              <path d="M3.5 10h17M8 3.5v3M16 3.5v3" stroke-linecap="round" />
            </svg>
          </div>
          <div class="header-copy">
            <p class="kicker">{{ roomTitle() }}</p>
            <h2>Availability calendar</h2>
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

          <div class="month-stats">
            <span class="stat-chip available">{{ monthStats().available }} open</span>
            @if (monthStats().selected > 0) {
              <span class="stat-chip selected">{{ monthStats().selected }} to block</span>
            }
            <span class="stat-chip blocked">{{ monthStats().blocked }} blocked</span>
            <span class="stat-chip booked">{{ monthStats().booked }} booked</span>
            @if (monthStats().partial > 0) {
              <span class="stat-chip partial">{{ monthStats().partial }} partial</span>
            }
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

            <div class="legend">
              <span><i class="dot available"></i> Available</span>
              <span><i class="dot partial"></i> Partial</span>
              <span><i class="dot booked"></i> Booked</span>
              <span><i class="dot blocked"></i> Blocked</span>
              <span><i class="dot selected"></i> To block</span>
            </div>

            <div class="weekdays">
              @for (day of weekdayLabels; track day) {
                <span>{{ day }}</span>
              }
            </div>
            <div class="weeks-wrap">
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
                        [attr.aria-pressed]="isDayClickable(cell) ? isDateSelected(cell.key) : null"
                        [title]="dayTitle(cell)"
                        (click)="onDayClick(cell)"
                      >
                        <span class="day-num">{{ cell.day }}</span>
                        @if (displayStatus(cell) === 'partial' && cell.label) {
                          <span class="day-meta">{{ cell.label }}</span>
                        }
                      </button>
                    } @else {
                      <span class="day empty"></span>
                    }
                  }
                </div>
              }
            </div>
          </section>
        </div>

        <footer class="panel-footer">
          <p class="hint">Click dates to block or unblock, then save.</p>
          <div class="update-actions">
            @if (hasChanges()) {
              <button type="button" class="btn btn-ghost btn-sm" (click)="resetSelection()">Reset</button>
            }
            <button
              type="button"
              class="btn btn-primary btn-sm"
              [disabled]="loading() || !hasChanges() || saving()"
              (click)="updateAvailability()"
            >
              {{ saving() ? 'Updating…' : 'Update availability' }}
            </button>
          </div>
        </footer>
      </div>
    </div>
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(26, 43, 60, 0.4);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      animation: fadeIn 0.2s ease;
    }

    .panel {
      width: 100%;
      max-width: 560px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--white);
      border-radius: var(--radius);
      box-shadow: 0 18px 48px rgba(26, 43, 60, 0.18), var(--shadow-md);
      animation: slideUp 0.22s ease;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 1.15rem 1.35rem;
      border-bottom: 1px solid var(--border-light);
      background: linear-gradient(180deg, #f7fafc 0%, var(--white) 100%);
      flex-shrink: 0;
    }

    .header-icon {
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: var(--primary-soft);
      color: var(--primary-dark);
      flex-shrink: 0;
    }

    .header-icon svg {
      width: 20px;
      height: 20px;
    }

    .header-copy {
      flex: 1;
      min-width: 0;
    }

    .kicker {
      margin: 0 0 0.15rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .panel-header h2 {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 700;
      color: var(--text);
    }

    .close {
      width: 34px;
      height: 34px;
      border: none;
      background: var(--primary-muted);
      color: var(--text-secondary);
      border-radius: 10px;
      font-size: 1.35rem;
      line-height: 1;
      cursor: pointer;
      flex-shrink: 0;
      transition: background var(--transition), color var(--transition);
    }

    .close:hover {
      background: var(--primary-soft);
      color: var(--primary-dark);
    }

    .panel-body {
      padding: 1rem 1.35rem 0.85rem;
      overflow: auto;
      flex: 1;
      min-height: 0;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: none; }
    }

    @keyframes shimmer {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }

    .calendar-loading .day.pending {
      background: linear-gradient(90deg, var(--primary-muted) 25%, var(--primary-soft) 50%, var(--primary-muted) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.2s ease-in-out infinite;
      color: transparent;
    }

    .month-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-bottom: 0.85rem;
      flex-shrink: 0;
    }

    .stat-chip {
      display: inline-flex;
      align-items: center;
      padding: 0.28rem 0.65rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    .stat-chip.available {
      background: #e6f4ed;
      color: var(--success);
    }

    .stat-chip.blocked {
      background: #ffedd5;
      color: #c2410c;
    }

    .stat-chip.booked {
      background: #fdeaea;
      color: var(--danger);
    }

    .stat-chip.partial {
      background: #fff8e6;
      color: #b8860b;
    }

    .stat-chip.selected {
      background: var(--primary-soft);
      color: var(--btn-primary-bg);
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.45rem 0.9rem;
      margin: 0 0 0.85rem;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .legend span {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }

    .dot {
      width: 9px;
      height: 9px;
      border-radius: 3px;
      display: inline-block;
    }

    .dot.available { background: #d8f0e4; border: 1px solid var(--success); }
    .dot.booked { background: #fdeaea; border: 1px solid var(--danger); }
    .dot.partial { background: #fff8e6; border: 1px solid #d4a017; }
    .dot.blocked { background: #ffedd5; border: 1px solid #f97316; }
    .dot.selected { background: var(--btn-primary-bg); border: 1px solid var(--btn-primary-bg); }

    .calendar {
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      padding: 0.9rem 0.9rem 0.85rem;
      background: linear-gradient(180deg, var(--white) 0%, var(--primary-muted) 100%);
    }

    .weeks-wrap {
      overflow: visible;
    }

    .month-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.65rem;
      margin-bottom: 0.85rem;
    }

    .month-nav h3 {
      margin: 0;
      min-width: 10.5rem;
      text-align: center;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text);
    }

    .nav-btn {
      width: 34px;
      height: 34px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--white);
      font-size: 1.25rem;
      line-height: 1;
      color: var(--text-secondary);
      cursor: pointer;
      transition: background var(--transition), border-color var(--transition), color var(--transition);
    }

    .nav-btn:hover:not(:disabled) {
      background: var(--primary-soft);
      border-color: var(--primary-light);
      color: var(--primary-dark);
    }

    .nav-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .weekdays,
    .week {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.35rem;
    }

    .weekdays {
      margin-bottom: 0.45rem;
    }

    .weekdays span {
      text-align: center;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .week {
      margin-bottom: 0.35rem;
    }

    .week:last-child {
      margin-bottom: 0;
    }

    .day {
      position: relative;
      min-height: 2.35rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.1rem;
      font-size: 0.8125rem;
      font-weight: 600;
      border-radius: 10px;
      background: transparent;
      color: var(--text);
      border: 1px solid transparent;
      padding: 0.15rem;
      font-family: inherit;
      transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
    }

    .day-num { line-height: 1; }
    .day-meta {
      font-size: 0.5625rem;
      font-weight: 700;
      line-height: 1;
      opacity: 0.9;
    }

    .day.clickable { cursor: pointer; }

    .day.clickable:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 3px 10px rgba(26, 43, 60, 0.08);
    }

    .day:disabled { cursor: default; }

    .day.empty {
      background: transparent;
      border: none;
      min-height: 2.35rem;
    }

    .day.available {
      background: #dff3e8;
      color: #246b4c;
      border-color: #b5dfc6;
    }

    .day.partial {
      background: #fff8e6;
      color: #b8860b;
      border-color: #f0dd9a;
    }

    .day.booked {
      background: #fdeaea;
      color: var(--danger);
      border-color: #f5cfcf;
    }

    .day.blocked {
      background: #ffedd5;
      color: #c2410c;
      border-color: #fdba74;
    }

    .day.selected {
      background: var(--btn-primary-bg);
      color: var(--white);
      border-color: var(--btn-primary-bg);
      box-shadow: 0 2px 8px rgba(74, 122, 156, 0.28);
    }

    .day.past {
      background: transparent;
      color: #8fa3b8;
      font-weight: 500;
    }

    .day.pending {
      background: var(--primary-muted);
      color: var(--text-muted);
      font-weight: 500;
    }

    .panel-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.9rem 1.35rem 1.05rem;
      border-top: 1px solid var(--border-light);
      background: #fafcfe;
      flex-shrink: 0;
    }

    .hint {
      margin: 0;
      font-size: 0.75rem;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .update-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    @media (max-width: 640px) {
      .overlay {
        padding: 0;
        align-items: flex-end;
      }

      .panel {
        max-width: none;
        max-height: 94vh;
        border-radius: 18px 18px 0 0;
      }

      .panel-header,
      .panel-body,
      .panel-footer {
        padding-left: 1rem;
        padding-right: 1rem;
      }

      .calendar {
        padding: 0.85rem 0.6rem 0.95rem;
      }

      .weekdays,
      .week {
        gap: 0.22rem;
      }

      .weekdays span { font-size: 0.5625rem; }

      .day {
        min-height: 2.15rem;
        font-size: 0.75rem;
        border-radius: 8px;
      }

      .day.empty { min-height: 2.15rem; }

      .panel-footer {
        flex-direction: column;
        align-items: stretch;
      }

      .update-actions {
        flex-direction: column-reverse;
        align-items: stretch;
      }

      .update-actions .btn { width: 100%; }
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

  protected readonly pendingChanges = computed(() => {
    const availability = this.availability();
    if (!availability) return { block: 0, unblock: 0 };
    const serverBlocked = new Set(availability.blockedDates ?? []);
    const selected = this.selectedDates();
    let block = 0;
    let unblock = 0;
    for (const date of selected) {
      if (!serverBlocked.has(date)) block++;
    }
    for (const date of serverBlocked) {
      if (!selected.has(date)) unblock++;
    }
    return { block, unblock };
  });

  protected readonly hasChanges = computed(() => {
    const { block, unblock } = this.pendingChanges();
    return block > 0 || unblock > 0;
  });

  protected readonly monthStats = computed(() => {
    let available = 0;
    let booked = 0;
    let blocked = 0;
    let partial = 0;
    let selected = 0;
    for (const week of this.currentMonth().weeks) {
      for (const cell of week) {
        const status = this.displayStatus(cell);
        if (status === 'available') available++;
        else if (status === 'selected') selected++;
        else if (status === 'booked') booked++;
        else if (status === 'blocked') blocked++;
        else if (status === 'partial') partial++;
      }
    }
    return { available, booked, blocked, partial, selected };
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
          this.reloadAvailability();
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
      if (Array.isArray(block.occupiedDates) && block.occupiedDates.length) {
        return block.occupiedDates.some((d) => String(d).slice(0, 10) === key);
      }
      const start = String(block.startDate).slice(0, 10);
      const end = String(block.endDate ?? block.startDate).slice(0, 10);
      // Stored ranges use exclusive end (like checkout)
      if (end > start) return key >= start && key < end;
      return key === start;
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
