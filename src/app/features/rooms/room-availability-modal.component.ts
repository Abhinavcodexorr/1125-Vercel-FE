import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { RoomAvailability, RoomBlockedDate, RoomBlockedDatesData } from '../../core/models/room.model';
import { RoomApiService } from '../../core/services/room-api.service';

type DayStatus = 'empty' | 'past' | 'available' | 'partial' | 'booked' | 'blocked';

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
  imports: [DatePipe, ReactiveFormsModule],
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

        @if (loading()) {
          <div class="panel-body loading">Loading availability…</div>
        } @else if (error()) {
          <div class="panel-body error">{{ error() }}</div>
        } @else {
          <div class="panel-body">
            @if (actionError()) {
              <div class="action-error">{{ actionError() }}</div>
            }

            @if (availability(); as avail) {
              <div class="summary">
                <span class="chip">{{ avail.room.quantity ?? avail.summary.quantity ?? 1 }} units</span>
                <span class="chip">{{ avail.summary.totalBookings }} bookings</span>
                <span class="chip booked">{{ avail.summary.totalUnavailableDays ?? avail.bookedDates.length }} full</span>
                <span class="chip partial">{{ avail.summary.totalPartiallyBookedDays ?? avail.partiallyBookedDates?.length ?? 0 }} partial</span>
                <span class="chip blocked">{{ blockedData()?.blocked?.length ?? 0 }} blocks</span>
                <span class="chip available">{{ avail.summary.totalAvailableDays }} available</span>
              </div>
            }

            <div class="legend">
              <span><i class="dot available"></i> Available</span>
              <span><i class="dot partial"></i> Partial</span>
              <span><i class="dot booked"></i> Fully booked</span>
              <span><i class="dot blocked"></i> Blocked</span>
              <span><i class="dot today"></i> Today</span>
            </div>

            <section class="calendar">
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
                      <span
                        class="day"
                        [class.available]="cell.status === 'available'"
                        [class.partial]="cell.status === 'partial'"
                        [class.booked]="cell.status === 'booked'"
                        [class.blocked]="cell.status === 'blocked'"
                        [class.past]="cell.status === 'past'"
                        [class.today]="cell.isToday"
                        [title]="cell.label || cell.key || ''"
                      >
                        {{ cell.label ?? cell.day }}
                      </span>
                    } @else {
                      <span class="day empty"></span>
                    }
                  }
                </div>
              }
            </section>

            <section class="block-form">
              <h3>Block dates</h3>
              <form [formGroup]="blockForm" (ngSubmit)="submitBlock()">
                <div formArrayName="ranges">
                  @for (range of blockRanges.controls; track $index; let i = $index) {
                    <div class="range-row" [formGroupName]="i">
                      <div class="form-row">
                        <div class="field">
                          <label>Start date</label>
                          <input type="date" formControlName="startDate" />
                        </div>
                        <div class="field">
                          <label>End date</label>
                          <input type="date" formControlName="endDate" />
                        </div>
                      </div>
                      <div class="field">
                        <label>Reason</label>
                        <input type="text" formControlName="reason" placeholder="Maintenance, private event…" />
                      </div>
                      @if (blockRanges.length > 1) {
                        <button type="button" class="btn btn-ghost btn-sm remove-range" (click)="removeRangeRow(i)">
                          Remove range
                        </button>
                      }
                    </div>
                  }
                </div>
                <div class="block-actions">
                  <button type="button" class="btn btn-secondary btn-sm" (click)="addRangeRow()">+ Add range</button>
                  <button type="submit" class="btn btn-primary btn-sm" [disabled]="blockForm.invalid || savingBlock()">
                    {{ savingBlock() ? 'Blocking…' : 'Block dates' }}
                  </button>
                </div>
              </form>
            </section>

            @if (blockedData()?.blocked; as blocks) {
              @if (blocks.length > 0) {
              <section class="blocks">
                <h3>Blocked ranges</h3>
                <ul>
                  @for (block of blocks; track block._id) {
                    <li>
                      <div class="block-info">
                        <strong>{{ block.startDate | date: 'mediumDate' }} → {{ block.endDate | date: 'mediumDate' }}</strong>
                        @if (block.reason) {
                          <span class="reason">{{ block.reason }}</span>
                        }
                      </div>
                      <button
                        type="button"
                        class="btn btn-danger btn-sm"
                        [disabled]="removingBlockId() === block._id"
                        (click)="removeBlock(block)"
                      >
                        {{ removingBlockId() === block._id ? 'Removing…' : 'Remove' }}
                      </button>
                    </li>
                  }
                </ul>
              </section>
              }
            }

            @if (availability()?.booked; as booked) {
              @if (booked.length > 0) {
              <section class="bookings">
                <h3>Bookings</h3>
                <ul>
                  @for (booking of booked; track booking.bookingReference) {
                    <li>
                      <strong>{{ booking.bookingReference }}</strong>
                      <span>{{ booking.checkInDate | date: 'mediumDate' }} → {{ booking.checkOutDate | date: 'mediumDate' }}</span>
                      <span>{{ booking.nights }} nights</span>
                      <span class="status">{{ booking.status }}</span>
                    </li>
                  }
                </ul>
              </section>
              }
            }
          </div>
        }
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

    .loading,
    .error {
      text-align: center;
      color: var(--text-secondary);
      font-size: 0.9375rem;
    }

    .error,
    .action-error {
      color: var(--danger);
    }

    .action-error {
      padding: 0.625rem 0.875rem;
      margin-bottom: 1rem;
      border-radius: var(--radius-sm);
      background: #fdecec;
      font-size: 0.8125rem;
    }

    .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .chip {
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      font-size: 0.8125rem;
      font-weight: 600;
      background: var(--primary-muted);
      color: var(--text-secondary);
    }

    .chip.booked {
      background: #fdeaea;
      color: var(--danger);
    }

    .chip.blocked {
      background: #fef6e6;
      color: var(--warning);
    }

    .chip.available {
      background: #e6f4ed;
      color: var(--success);
    }

    .chip.partial {
      background: #fff8e6;
      color: #b8860b;
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

    .dot.partial {
      background: #fff8e6;
      border: 1px solid #d4a017;
    }

    .dot.blocked {
      background: #fef6e6;
      border: 1px solid var(--warning);
    }

    .dot.today {
      background: var(--primary-soft);
      border: 2px solid var(--primary);
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
      background: #fef6e6;
      color: #b8860b;
    }

    .day.past {
      background: #f4f6f8;
      color: var(--text-muted);
    }

    .day.today {
      box-shadow: inset 0 0 0 2px var(--primary);
    }

    .block-form,
    .blocks,
    .bookings {
      margin-top: 1.25rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-light);
    }

    .block-form h3,
    .blocks h3,
    .bookings h3 {
      margin: 0 0 0.75rem;
      font-size: 0.9375rem;
      font-weight: 700;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .field {
      margin-bottom: 0.75rem;
    }

    .field label {
      display: block;
      margin-bottom: 0.35rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text);
    }

    .field input {
      width: 100%;
      padding: 0.5rem 0.625rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
    }

    .range-row {
      padding-bottom: 0.75rem;
      margin-bottom: 0.75rem;
      border-bottom: 1px dashed var(--border-light);
    }

    .range-row:last-of-type {
      border-bottom: none;
      margin-bottom: 0;
    }

    .remove-range {
      margin-bottom: 0.5rem;
    }

    .block-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }

    .blocks ul,
    .bookings ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .blocks li,
    .bookings li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .block-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
    }

    .block-info strong,
    .bookings strong {
      color: var(--text);
      font-size: 0.875rem;
    }

    .reason {
      color: var(--text-muted);
    }

    .status {
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: var(--primary-muted);
      font-weight: 600;
    }
  `,
})
export class RoomAvailabilityModalComponent implements OnInit {
  private readonly roomApi = inject(RoomApiService);
  private readonly fb = inject(FormBuilder);

  readonly idOrSlug = input.required<string>();
  readonly roomTitle = input.required<string>();
  readonly closed = output<void>();

  protected readonly weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly savingBlock = signal(false);
  protected readonly removingBlockId = signal<string | null>(null);
  protected readonly availability = signal<RoomAvailability | null>(null);
  protected readonly blockedData = signal<RoomBlockedDatesData | null>(null);
  protected readonly viewMonth = signal(monthIndex(new Date()));

  protected readonly blockForm = this.fb.nonNullable.group({
    ranges: this.fb.nonNullable.array([this.createRangeGroup()]),
  });

  protected get blockRanges(): FormArray {
    return this.blockForm.controls.ranges;
  }

  protected readonly monthBounds = computed(() => {
    const availability = this.availability();
    const blocked = this.blockedData();
    if (!availability && !blocked) return { min: monthIndex(new Date()), max: monthIndex(new Date()) };
    return getMonthBounds(
      availability?.bookedDates ?? [],
      availability?.partiallyBookedDates ?? [],
      availability?.availableDates ?? [],
      blocked?.blockedDates ?? [],
    );
  });

  protected readonly currentMonth = computed(() => {
    const availability = this.availability();
    const blocked = this.blockedData();
    const view = this.viewMonth();
    if (!availability) return emptyMonth(view);
    return buildMonth(
      monthFromIndex(view),
      new Set(availability.bookedDates),
      new Set(availability.partiallyBookedDates ?? []),
      new Set(blocked?.blockedDates ?? []),
      new Set(availability.availableDates),
      availability.occupancyByDate ?? {},
      availability.room.quantity ?? availability.summary.quantity ?? 1,
      startOfDay(new Date()),
      dateKey(startOfDay(new Date())),
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

  submitBlock(): void {
    if (this.blockForm.invalid || this.savingBlock()) return;

    const ranges = this.blockRanges.getRawValue();
    for (const range of ranges) {
      if (range.endDate <= range.startDate) {
        this.actionError.set('End date must be after start date.');
        return;
      }
    }

    this.savingBlock.set(true);
    this.actionError.set(null);

    const payload =
      ranges.length === 1
        ? {
            startDate: ranges[0].startDate,
            endDate: ranges[0].endDate,
            reason: ranges[0].reason.trim() || undefined,
          }
        : {
            blocks: ranges.map((range) => ({
              startDate: range.startDate,
              endDate: range.endDate,
              reason: range.reason.trim() || undefined,
            })),
          };

    this.roomApi.addBlockedDates(this.idOrSlug(), payload).subscribe({
      next: (result) => {
        this.blockedData.set({
          room: result.room,
          total: result.blocked.length,
          blocked: result.blocked,
          blockedDates: result.blockedDates,
        });
        this.blockForm.setControl('ranges', this.fb.nonNullable.array([this.createRangeGroup()]));
        this.savingBlock.set(false);
        this.refreshAvailability();
      },
      error: (err) => {
        this.actionError.set(extractApiError(err, 'Failed to block dates.'));
        this.savingBlock.set(false);
      },
    });
  }

  addRangeRow(): void {
    this.blockRanges.push(this.createRangeGroup());
  }

  removeRangeRow(index: number): void {
    if (this.blockRanges.length > 1) {
      this.blockRanges.removeAt(index);
    }
  }

  private createRangeGroup() {
    return this.fb.nonNullable.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      reason: [''],
    });
  }

  removeBlock(block: RoomBlockedDate): void {
    if (!confirm('Remove this blocked date range?')) return;

    this.removingBlockId.set(block._id);
    this.actionError.set(null);

    this.roomApi.removeBlockedDate(this.idOrSlug(), block._id).subscribe({
      next: (result) => {
        this.blockedData.set({
          room: result.room,
          total: result.blocked.length,
          blocked: result.blocked,
          blockedDates: result.blockedDates,
        });
        this.removingBlockId.set(null);
        this.refreshAvailability();
      },
      error: (err) => {
        this.actionError.set(extractApiError(err, 'Failed to remove block.'));
        this.removingBlockId.set(null);
      },
    });
  }

  private loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      availability: this.roomApi.getAvailability(this.idOrSlug()),
      blocked: this.roomApi.getBlockedDates(this.idOrSlug()),
    }).subscribe({
      next: ({ availability, blocked }) => {
        this.availability.set(availability);
        this.blockedData.set(blocked);
        this.viewMonth.set(monthIndex(new Date()));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiError(err, 'Failed to load availability.'));
        this.loading.set(false);
      },
    });
  }

  private refreshAvailability(): void {
    this.roomApi.getAvailability(this.idOrSlug()).subscribe({
      next: (data) => this.availability.set(data),
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

function getMonthBounds(
  bookedDates: string[],
  partialDates: string[],
  availableDates: string[],
  blockedDates: string[],
): { min: number; max: number } {
  const today = startOfDay(new Date());
  const current = monthIndex(today);
  let max = monthIndex(addDays(today, 365));

  const allKeys = [...bookedDates, ...partialDates, ...availableDates, ...blockedDates];
  if (allKeys.length > 0) {
    const parsed = allKeys.map(parseDateKey);
    const maxDate = parsed.reduce((latest, date) => (date > latest ? date : latest), parsed[0]);
    max = Math.max(max, monthIndex(maxDate));
  }

  return { min: current, max };
}

function monthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

function monthFromIndex(index: number): Date {
  return new Date(Math.floor(index / 12), index % 12, 1);
}

function emptyMonth(index: number): CalendarMonth {
  const label = monthFromIndex(index).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return { label, weeks: [] };
}

function buildMonth(
  monthStart: Date,
  bookedSet: Set<string>,
  partialSet: Set<string>,
  blockedSet: Set<string>,
  availableSet: Set<string>,
  occupancyByDate: Record<string, { bookedCount: number; availableUnits: number; quantity: number; blocked: boolean }>,
  roomQuantity: number,
  today: Date,
  todayKey: string,
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

    if (blockedSet.has(key) || occupancy?.blocked) {
      status = 'blocked';
    } else if (bookedSet.has(key)) {
      status = 'booked';
    } else if (partialSet.has(key) || (occupancy && occupancy.bookedCount > 0 && occupancy.availableUnits > 0)) {
      status = 'partial';
      const qty = occupancy?.quantity ?? roomQuantity;
      const available = occupancy?.availableUnits ?? Math.max(qty - (occupancy?.bookedCount ?? 0), 0);
      label = `${available}/${qty}`;
    } else if (date < today) {
      status = 'past';
    } else if (availableSet.has(key)) {
      status = 'available';
    } else {
      status = 'past';
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
