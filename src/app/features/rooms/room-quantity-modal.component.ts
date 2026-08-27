import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoomDateOccupancy, RoomQuantityCalendar } from '../../core/models/room.model';
import { RoomApiService } from '../../core/services/room-api.service';

type DayStatus = 'empty' | 'past' | 'pending' | 'available' | 'partial' | 'booked' | 'blocked' | 'limited';

interface CalendarDay {
  key: string | null;
  day: number;
  status: DayStatus;
  label?: string;
}

interface CalendarMonth {
  label: string;
  weeks: CalendarDay[][];
}

@Component({
  selector: 'app-room-quantity-modal',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <div class="overlay" (click)="closed.emit()">
      <div class="panel" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <header class="panel-header">
          <div class="header-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </div>
          <div class="header-copy">
            <p class="kicker">{{ roomTitle() }}</p>
            <h2>Manage quantity</h2>
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
            <span class="stat-chip stock">{{ maxQuantity() }} units total</span>
            @if (overrideCount(); as count) {
              @if (count > 0) {
                <span class="stat-chip limited">{{ count }} custom day{{ count === 1 ? '' : 's' }}</span>
              }
            }
          </div>

          <div class="layout">
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
                        [class.available]="cell.status === 'available'"
                        [class.partial]="cell.status === 'partial'"
                        [class.limited]="cell.status === 'limited'"
                        [class.booked]="cell.status === 'booked'"
                        [class.blocked]="cell.status === 'blocked'"
                        [class.past]="cell.status === 'past'"
                        [class.pending]="cell.status === 'pending'"
                        [class.focused]="focusedDate() === cell.key"
                        [disabled]="!isDaySelectable(cell)"
                        [title]="dayTitle(cell)"
                        (click)="selectDate(cell.key!)"
                      >
                        <span class="day-num">{{ cell.day }}</span>
                        @if (cell.label) {
                          <span class="day-occ">{{ cell.label }}</span>
                        }
                      </button>
                    } @else {
                      <span class="day empty"></span>
                    }
                  }
                </div>
              }

              <div class="legend">
                <span><i class="dot available"></i> Full stock</span>
                <span><i class="dot limited"></i> Limited</span>
                <span><i class="dot partial"></i> Part booked</span>
                <span><i class="dot booked"></i> Full</span>
              </div>
            </section>

            @if (focusedDate(); as key) {
              <section class="editor">
                <div class="editor-top">
                  <p class="editor-kicker">Selected date</p>
                  <h3>{{ toDate(key) | date: 'EEE, MMM d, y' }}</h3>
                  @if (hasOverride(key)) {
                    <span class="badge-limited">Custom limit</span>
                  } @else {
                    <span class="badge-default">Default stock</span>
                  }
                </div>

                @if (focusedOccupancy(); as occ) {
                  <div class="occ-grid">
                    <div class="occ-card">
                      <span class="occ-label">Booked</span>
                      <strong>{{ occ.bookedCount }}</strong>
                    </div>
                    <div class="occ-card free">
                      <span class="occ-label">Free now</span>
                      <strong>{{ occ.availableUnits }}</strong>
                    </div>
                    <div class="occ-card stock">
                      <span class="occ-label">Sellable</span>
                      <strong>{{ occ.quantity }}</strong>
                    </div>
                  </div>
                }

                <div class="stepper-wrap">
                  <span class="stepper-label">Units available to sell</span>
                  <div class="stepper">
                    <button
                      type="button"
                      class="stepper-btn"
                      [disabled]="saving() || draftQuantity <= minEditableQuantity()"
                      (click)="nudge(-1)"
                      aria-label="Decrease"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      class="stepper-input"
                      [min]="minEditableQuantity()"
                      [max]="maxQuantity()"
                      [(ngModel)]="draftQuantity"
                      (ngModelChange)="clampDraft()"
                    />
                    <button
                      type="button"
                      class="stepper-btn"
                      [disabled]="saving() || draftQuantity >= maxQuantity()"
                      (click)="nudge(1)"
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>
                  <p class="stepper-hint">
                    Min {{ minEditableQuantity() }} (already booked) · Max {{ maxQuantity() }}
                  </p>
                </div>

                <div class="editor-actions">
                  @if (hasOverride(key)) {
                    <button type="button" class="btn btn-ghost" [disabled]="saving()" (click)="resetToDefault()">
                      Reset to {{ maxQuantity() }}
                    </button>
                  }
                  <button
                    type="button"
                    class="btn btn-primary"
                    [disabled]="saving() || !canSave()"
                    (click)="saveQuantity()"
                  >
                    {{ saving() ? 'Saving…' : 'Save quantity' }}
                  </button>
                </div>
              </section>
            } @else if (!loading()) {
              <section class="editor editor-empty">
                <div class="empty-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M8 3v4M16 3v4M3 10h18" />
                  </svg>
                </div>
                <p>Select a date to set how many units can be sold that day.</p>
              </section>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(26, 43, 60, 0.42);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      animation: fadeIn 0.2s ease;
    }

    .panel {
      width: 100%;
      max-width: 900px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--white);
      border-radius: calc(var(--radius) + 2px);
      box-shadow: 0 22px 56px rgba(26, 43, 60, 0.2), var(--shadow-md);
      animation: slideUp 0.24s ease;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1.15rem 1.4rem;
      border-bottom: 1px solid var(--border-light);
      background: linear-gradient(180deg, #f4f8fb 0%, var(--white) 100%);
      flex-shrink: 0;
    }

    .header-icon {
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: linear-gradient(145deg, var(--primary-soft), #d7e8f4);
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
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .panel-header h2 {
      margin: 0;
      font-size: 1.1rem;
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
      transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
    }

    .close:hover {
      background: var(--primary-soft);
      color: var(--primary-dark);
      transform: scale(1.04);
    }

    .panel-body {
      padding: 1.05rem 1.4rem 1.35rem;
      overflow: auto;
      flex: 1;
      min-height: 0;
      background: linear-gradient(180deg, #fbfcfd 0%, var(--white) 40%);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: none; }
    }

    @keyframes shimmer {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }

    .month-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-bottom: 0.95rem;
    }

    .stat-chip {
      display: inline-flex;
      align-items: center;
      padding: 0.3rem 0.7rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 650;
    }

    .stat-chip.stock {
      background: var(--primary-soft);
      color: var(--primary-dark);
    }

    .stat-chip.limited {
      background: #fff1e0;
      color: #c2410c;
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.9fr);
      gap: 1rem;
      align-items: stretch;
    }

    @media (max-width: 780px) {
      .layout { grid-template-columns: 1fr; }
      .overlay { padding: 0.75rem; align-items: flex-end; }
      .panel { max-height: 94vh; border-radius: 16px 16px 10px 10px; }
    }

    .calendar {
      border: 1px solid var(--border-light);
      border-radius: 14px;
      padding: 1rem 1rem 0.85rem;
      background: linear-gradient(180deg, var(--white) 0%, #f7fafc 100%);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
    }

    .calendar-loading .day.pending {
      background: linear-gradient(90deg, var(--primary-muted) 25%, var(--primary-soft) 50%, var(--primary-muted) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.15s ease-in-out infinite;
      color: transparent;
    }

    .month-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.65rem;
      margin-bottom: 0.85rem;
    }

    .month-nav h3 {
      margin: 0;
      flex: 1;
      text-align: center;
      font-size: 1rem;
      font-weight: 750;
      color: var(--text);
      letter-spacing: -0.01em;
    }

    .nav-btn {
      width: 36px;
      height: 36px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--white);
      color: var(--text);
      font-size: 1.25rem;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
    }

    .nav-btn:hover:not(:disabled) {
      background: var(--primary-soft);
      border-color: var(--primary-light);
      color: var(--primary-dark);
      transform: translateY(-1px);
    }

    .nav-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .weekdays,
    .week {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 5px;
    }

    .weekdays {
      margin-bottom: 6px;
    }

    .weekdays span {
      text-align: center;
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .day {
      aspect-ratio: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      font-size: 0.78rem;
      font-weight: 650;
      border-radius: 10px;
      border: 1px solid transparent;
      padding: 0;
      background: #eef3f7;
      color: var(--text-muted);
      cursor: pointer;
      transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease, border-color 0.14s ease;
    }

    .day:not(:disabled):hover {
      transform: translateY(-1px) scale(1.03);
      box-shadow: 0 6px 14px rgba(26, 43, 60, 0.1);
    }

    .day.empty {
      background: transparent;
      border: none;
      cursor: default;
      box-shadow: none;
    }

    .day.available {
      background: #e4f5ec;
      color: #1f7a4d;
      border-color: #c7ebd7;
    }

    .day.limited {
      background: #fff3e4;
      color: #c2410c;
      border-color: #ffd8b0;
    }

    .day.partial {
      background: #fff8e4;
      color: #a16207;
      border-color: #f3e0a8;
    }

    .day.booked {
      background: #fde8e8;
      color: #c03535;
      border-color: #f5c4c4;
      cursor: not-allowed;
    }

    .day.blocked {
      background: #ffe8d6;
      color: #c2410c;
      border-color: #ffd0a8;
      cursor: not-allowed;
    }

    .day.past {
      background: #f3f5f7;
      color: #9aa6b2;
      cursor: not-allowed;
    }

    .day.pending {
      background: var(--primary-muted);
    }

    .day.focused {
      border-color: var(--primary-dark);
      box-shadow: 0 0 0 2px rgba(90, 138, 173, 0.28), 0 8px 16px rgba(26, 43, 60, 0.12);
      transform: translateY(-1px) scale(1.04);
      z-index: 1;
    }

    .day-num {
      line-height: 1;
      font-size: 0.8rem;
    }

    .day-occ {
      font-size: 0.58rem;
      line-height: 1;
      font-weight: 750;
      opacity: 0.95;
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.55rem 0.95rem;
      margin-top: 0.9rem;
      padding-top: 0.75rem;
      border-top: 1px dashed var(--border-light);
      font-size: 0.72rem;
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

    .dot.available { background: #e4f5ec; border: 1px solid #1f7a4d; }
    .dot.limited { background: #fff3e4; border: 1px solid #c2410c; }
    .dot.partial { background: #fff8e4; border: 1px solid #a16207; }
    .dot.booked { background: #fde8e8; border: 1px solid #c03535; }

    .editor {
      border: 1px solid var(--border-light);
      border-radius: 14px;
      padding: 1.1rem 1.05rem;
      background: linear-gradient(165deg, #ffffff 0%, #f5f9fc 100%);
      box-shadow: 0 10px 28px rgba(26, 43, 60, 0.05);
      display: flex;
      flex-direction: column;
      min-height: 100%;
      animation: slideUp 0.2s ease;
    }

    .editor-top {
      margin-bottom: 1rem;
    }

    .editor-kicker {
      margin: 0;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .editor h3 {
      margin: 0.35rem 0 0.55rem;
      font-size: 1.05rem;
      font-weight: 750;
      color: var(--text);
      letter-spacing: -0.01em;
    }

    .badge-limited,
    .badge-default {
      display: inline-flex;
      align-items: center;
      padding: 0.22rem 0.55rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
    }

    .badge-limited {
      background: #fff1e0;
      color: #c2410c;
    }

    .badge-default {
      background: #e8f5ee;
      color: #1f7a4d;
    }

    .occ-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      margin-bottom: 1.1rem;
    }

    .occ-card {
      border-radius: 12px;
      padding: 0.65rem 0.45rem;
      text-align: center;
      background: #f2f6f9;
      border: 1px solid #e4ebf1;
    }

    .occ-card.free {
      background: #e8f6ef;
      border-color: #cfe9db;
    }

    .occ-card.stock {
      background: var(--primary-soft);
      border-color: #c9dde9;
    }

    .occ-label {
      display: block;
      font-size: 0.65rem;
      font-weight: 650;
      color: var(--text-muted);
      margin-bottom: 0.2rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .occ-card strong {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text);
    }

    .stepper-wrap {
      margin-bottom: 1.15rem;
    }

    .stepper-label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text);
    }

    .stepper {
      display: grid;
      grid-template-columns: 44px 1fr 44px;
      gap: 0.45rem;
      align-items: center;
    }

    .stepper-btn {
      height: 44px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--white);
      color: var(--primary-dark);
      font-size: 1.25rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, transform 0.12s ease;
    }

    .stepper-btn:hover:not(:disabled) {
      background: var(--primary-soft);
      border-color: var(--primary-light);
      transform: translateY(-1px);
    }

    .stepper-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .stepper-input {
      height: 44px;
      width: 100%;
      text-align: center;
      border: 1.5px solid var(--primary-light, #8fb2cb);
      border-radius: 12px;
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--primary-dark);
      background: #f7fbfe;
      outline: none;
      transition: box-shadow 0.15s ease, border-color 0.15s ease;
    }

    .stepper-input:focus {
      border-color: var(--primary-dark);
      box-shadow: 0 0 0 3px rgba(90, 138, 173, 0.2);
    }

    .stepper-input::-webkit-outer-spin-button,
    .stepper-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .stepper-input[type='number'] {
      -moz-appearance: textfield;
    }

    .stepper-hint {
      margin: 0.45rem 0 0;
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .editor-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: auto;
    }

    .btn {
      min-height: 2.45rem;
      padding: 0.55rem 1rem;
      border-radius: 11px;
      font-size: 0.8125rem;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid transparent;
      transition: transform 0.12s ease, filter 0.12s ease, background 0.15s ease;
    }

    .btn:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none;
    }

    .btn-ghost {
      background: var(--white);
      color: var(--text-secondary);
      border-color: var(--border);
    }

    .btn-ghost:hover:not(:disabled) {
      background: #f5f7f9;
      color: var(--text);
    }

    .btn-primary {
      background: var(--btn-primary-bg, var(--primary-dark));
      color: var(--white);
      box-shadow: 0 8px 18px rgba(74, 117, 150, 0.25);
    }

    .btn-primary:hover:not(:disabled) {
      filter: brightness(1.05);
    }

    .editor-empty {
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 0.75rem;
      color: var(--text-muted);
      min-height: 280px;
    }

    .empty-icon {
      width: 54px;
      height: 54px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: var(--primary-soft);
      color: var(--primary-dark);
    }

    .empty-icon svg {
      width: 24px;
      height: 24px;
    }

    .editor-empty p {
      margin: 0;
      max-width: 16rem;
      font-size: 0.875rem;
      line-height: 1.45;
    }
  `,
})
export class RoomQuantityModalComponent implements OnInit {
  private readonly roomApi = inject(RoomApiService);

  readonly idOrSlug = input.required<string>();
  readonly roomTitle = input.required<string>();
  readonly roomQuantity = input.required<number>();
  readonly closed = output<void>();
  readonly updated = output<void>();

  protected readonly weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly calendar = signal<RoomQuantityCalendar | null>(null);
  protected readonly viewMonth = signal(monthIndex(new Date()));
  protected readonly focusedDate = signal<string | null>(null);
  protected draftQuantity = 0;

  protected readonly maxQuantity = computed(() => this.calendar()?.room.quantity ?? this.roomQuantity());

  protected readonly overrideCount = computed(
    () => this.calendar()?.quantityOverrides?.length ?? 0,
  );

  protected readonly monthBounds = computed(() => {
    const today = startOfDay(new Date());
    return { min: monthIndex(today), max: monthIndex(addDays(today, 365)) };
  });

  protected readonly currentMonth = computed(() => {
    const data = this.calendar();
    const view = this.viewMonth();
    const today = startOfDay(new Date());

    return buildMonth(
      monthFromIndex(view),
      data ? new Set(data.bookedDates) : new Set(),
      data?.occupancyByDate ?? {},
      data?.room.quantity ?? this.roomQuantity(),
      today,
      data != null,
    );
  });

  protected readonly canGoPrev = computed(() => this.viewMonth() > this.monthBounds().min);
  protected readonly canGoNext = computed(() => this.viewMonth() < this.monthBounds().max);

  protected readonly focusedOccupancy = computed((): RoomDateOccupancy | null => {
    const key = this.focusedDate();
    const data = this.calendar();
    if (!key || !data?.occupancyByDate) return null;
    return data.occupancyByDate[key] ?? null;
  });

  ngOnInit(): void {
    this.loadCalendar();
  }

  prevMonth(): void {
    if (this.canGoPrev()) this.viewMonth.update((m) => m - 1);
  }

  nextMonth(): void {
    if (this.canGoNext()) this.viewMonth.update((m) => m + 1);
  }

  isDaySelectable(cell: CalendarDay): boolean {
    return (
      cell.status !== 'past' &&
      cell.status !== 'empty' &&
      cell.status !== 'pending' &&
      cell.status !== 'booked' &&
      cell.status !== 'blocked'
    );
  }

  dayTitle(cell: CalendarDay): string {
    if (cell.status === 'booked') return 'Fully booked';
    if (cell.status === 'blocked') return 'Blocked';
    if (cell.status === 'limited') return `Limited stock ${cell.label ?? ''}`.trim();
    if (cell.status === 'partial') return `Part booked ${cell.label ?? ''}`.trim();
    return 'Click to edit quantity';
  }

  selectDate(key: string): void {
    const occ = this.calendar()?.occupancyByDate?.[key];
    if (occ?.blocked) return;
    if (occ && occ.availableUnits <= 0 && occ.bookedCount > 0) return;
    this.focusedDate.set(key);
    this.draftQuantity = occ?.quantity ?? this.maxQuantity();
    this.actionError.set(null);
  }

  nudge(delta: number): void {
    this.draftQuantity = Number(this.draftQuantity) + delta;
    this.clampDraft();
  }

  clampDraft(): void {
    const min = this.minEditableQuantity();
    const max = this.maxQuantity();
    let value = Number(this.draftQuantity);
    if (!Number.isFinite(value)) value = min;
    this.draftQuantity = Math.min(max, Math.max(min, Math.round(value)));
  }

  minEditableQuantity(): number {
    const key = this.focusedDate();
    const booked = key ? this.calendar()?.occupancyByDate?.[key]?.bookedCount ?? 0 : 0;
    return Math.max(booked, 0);
  }

  hasOverride(key: string): boolean {
    return (this.calendar()?.quantityOverrides ?? []).some((item) => item.date === key);
  }

  canSave(): boolean {
    const key = this.focusedDate();
    if (!key) return false;
    const qty = Number(this.draftQuantity);
    if (!Number.isFinite(qty)) return false;
    if (qty < this.minEditableQuantity() || qty > this.maxQuantity()) return false;
    const current = this.calendar()?.occupancyByDate?.[key]?.quantity ?? this.maxQuantity();
    return qty !== current;
  }

  resetToDefault(): void {
    this.draftQuantity = this.maxQuantity();
    this.saveQuantity(true);
  }

  saveQuantity(reset = false): void {
    const key = this.focusedDate();
    if (!key) return;

    this.saving.set(true);
    this.actionError.set(null);

    const payload = reset
      ? [{ date: key, quantity: null }]
      : [{ date: key, quantity: Number(this.draftQuantity) }];

    this.roomApi.setQuantityOverrides(this.idOrSlug(), payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.loadCalendar(false);
        this.updated.emit();
      },
      error: (err) => {
        this.actionError.set(extractApiError(err, 'Failed to update quantity.'));
        this.saving.set(false);
      },
    });
  }

  protected toDate(key: string): Date {
    return parseDateKey(key);
  }

  private loadCalendar(resetMonth = true): void {
    const keepFocused = this.focusedDate();
    this.loading.set(true);
    this.error.set(null);
    this.roomApi.getQuantityCalendar(this.idOrSlug()).subscribe({
      next: (data) => {
        this.calendar.set(data);
        if (resetMonth) this.viewMonth.set(monthIndex(new Date()));
        if (keepFocused) {
          this.focusedDate.set(keepFocused);
          const occ = data.occupancyByDate?.[keepFocused];
          this.draftQuantity = occ?.quantity ?? data.room.quantity ?? this.roomQuantity();
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiError(err, 'Failed to load quantity calendar.'));
        this.loading.set(false);
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
  occupancyByDate: Record<string, RoomDateOccupancy>,
  roomQuantity: number,
  today: Date,
  dataLoaded: boolean,
): CalendarMonth {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: CalendarDay[] = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ key: null, day: 0, status: 'empty' });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const occupancy = occupancyByDate[key];
    const quantity = occupancy?.quantity ?? roomQuantity;
    let status: DayStatus;
    let label: string | undefined;

    if (date < today) {
      status = 'past';
    } else if (occupancy?.blocked) {
      status = 'blocked';
    } else if (occupancy && occupancy.availableUnits <= 0 && occupancy.bookedCount > 0) {
      status = 'booked';
    } else if (!dataLoaded) {
      status = 'pending';
    } else if (occupancy && occupancy.bookedCount > 0 && occupancy.availableUnits > 0) {
      status = 'partial';
      label = `${occupancy.availableUnits}/${quantity}`;
    } else if (occupancy?.overrideQuantity != null && occupancy.overrideQuantity < roomQuantity) {
      status = 'limited';
      label = `${quantity}/${roomQuantity}`;
    } else if (bookedSet.has(key)) {
      status = 'booked';
    } else {
      status = 'available';
    }

    cells.push({ key, day, status, label });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: null, day: 0, status: 'empty' });
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
  const [year, month, day] = value.split('-').map(Number);
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
