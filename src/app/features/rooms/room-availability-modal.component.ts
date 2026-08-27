import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import {
  RoomAvailability,
  RoomBlockedDate,
  RoomDateOccupancy,
  RoomQuantityCalendar,
  mergeBlockedDatesIntoAvailability,
} from '../../core/models/room.model';
import { RoomApiService } from '../../core/services/room-api.service';

type DayStatus = 'empty' | 'past' | 'pending' | 'available' | 'partial' | 'booked' | 'blocked' | 'limited';

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
  imports: [DatePipe],
  template: `
    <div class="overlay" (click)="closed.emit()">
      <div class="panel" [class.multi]="isMultiUnit()" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
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
            @if (!isMultiUnit() && monthStats().selected > 0) {
              <span class="stat-chip selected">{{ monthStats().selected }} to block</span>
            }
            <span class="stat-chip blocked">{{ monthStats().blocked }} blocked</span>
            <span class="stat-chip booked">{{ monthStats().booked }} booked</span>
            @if (monthStats().partial > 0) {
              <span class="stat-chip partial">{{ monthStats().partial }} partial</span>
            }
          </div>

          <div class="layout" [class.single]="!isMultiUnit()">
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
                @if (isMultiUnit()) {
                  <span><i class="dot limited"></i> Limited</span>
                }
                <span><i class="dot partial"></i> Partial</span>
                <span><i class="dot booked"></i> Booked</span>
                <span><i class="dot blocked"></i> Blocked</span>
                @if (!isMultiUnit()) {
                  <span><i class="dot selected"></i> To block</span>
                }
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
                          [class.limited]="displayStatus(cell) === 'limited'"
                          [class.booked]="displayStatus(cell) === 'booked'"
                          [class.blocked]="displayStatus(cell) === 'blocked'"
                          [class.past]="displayStatus(cell) === 'past'"
                          [class.pending]="displayStatus(cell) === 'pending'"
                          [class.selected]="displayStatus(cell) === 'selected'"
                          [class.focused]="isMultiUnit() && focusedDate() === cell.key"
                          [class.clickable]="isDayClickable(cell)"
                          [disabled]="!isDayClickable(cell)"
                          [attr.aria-pressed]="!isMultiUnit() && isDayClickable(cell) ? isDateSelected(cell.key) : null"
                          [title]="dayTitle(cell)"
                          (click)="onDayClick(cell)"
                        >
                          <span class="day-num">{{ cell.day }}</span>
                          @if (cell.label) {
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

            @if (isMultiUnit()) {
              @if (focusedDate(); as key) {
                <section class="editor">
                  <div class="editor-top">
                    <p class="editor-kicker">Selected date</p>
                    <h3>{{ toDate(key) | date: 'EEE, MMM d, y' }}</h3>
                    @if (isServerBlocked(key)) {
                      <span class="badge blocked">Blocked</span>
                    } @else if (focusedOccupancy()?.availableUnits === 0 && (focusedOccupancy()?.bookedCount ?? 0) > 0) {
                      <span class="badge booked">Fully booked</span>
                    } @else if (hasOverride(key)) {
                      <span class="badge limited">Custom limit</span>
                    } @else {
                      <span class="badge open">Open</span>
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

                  @if (!isServerBlocked(key)) {
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
                          [value]="draftQuantity"
                          (input)="onDraftInput($event)"
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
                  }

                  <p class="editor-hint">
                    @if (isServerBlocked(key)) {
                      This date is blocked. Unblock it to sell remaining units again.
                    } @else {
                      Set how many units can be sold this day, or block it entirely.
                    }
                  </p>

                  <div class="editor-actions">
                    @if (isServerBlocked(key)) {
                      <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="unblockFocusedDate()">
                        {{ saving() ? 'Updating…' : 'Unblock date' }}
                      </button>
                    } @else {
                      @if (hasOverride(key)) {
                        <button type="button" class="btn btn-ghost" [disabled]="saving()" (click)="resetQuantity()">
                          Reset to {{ maxQuantity() }}
                        </button>
                      }
                      <button
                        type="button"
                        class="btn btn-primary"
                        [disabled]="saving() || !canSaveQuantity()"
                        (click)="saveQuantity()"
                      >
                        {{ saving() ? 'Updating…' : 'Update quantity' }}
                      </button>
                      <button
                        type="button"
                        class="btn btn-ghost"
                        [disabled]="saving() || !canBlockFocused()"
                        (click)="blockFocusedDate()"
                      >
                        Block date
                      </button>
                    }
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
                  <p>Select a date to manage quantity or block it.</p>
                </section>
              }
            }
          </div>
        </div>

        @if (!isMultiUnit()) {
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
        }
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

    .panel.multi {
      max-width: 900px;
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
    .dot.limited { background: #fff3e4; border: 1px solid #c2410c; }
    .dot.blocked { background: #ffedd5; border: 1px solid #f97316; }
    .dot.selected { background: var(--btn-primary-bg); border: 1px solid var(--btn-primary-bg); }

    .calendar {
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      padding: 0.9rem 0.9rem 0.85rem;
      background: linear-gradient(180deg, var(--white) 0%, var(--primary-muted) 100%);
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.9fr);
      gap: 1rem;
      align-items: stretch;
    }

    .layout.single {
      display: block;
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

    .day.limited {
      background: #fff3e4;
      color: #c2410c;
      border-color: #ffd8b0;
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

    .day.focused {
      border-color: var(--primary-dark);
      box-shadow: 0 0 0 2px rgba(90, 138, 173, 0.28), 0 8px 16px rgba(26, 43, 60, 0.12);
      transform: translateY(-1px) scale(1.04);
      z-index: 1;
    }

    .editor {
      border: 1px solid var(--border-light);
      border-radius: 14px;
      padding: 1.1rem 1.05rem;
      background: linear-gradient(165deg, #ffffff 0%, #f5f9fc 100%);
      box-shadow: 0 10px 28px rgba(26, 43, 60, 0.05);
      display: flex;
      flex-direction: column;
      min-height: 100%;
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
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.22rem 0.55rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
    }

    .badge.open {
      background: #e8f5ee;
      color: #1f7a4d;
    }

    .badge.blocked {
      background: #fff1e0;
      color: #c2410c;
    }

    .badge.booked {
      background: #fdeaea;
      color: var(--danger);
    }

    .badge.limited {
      background: #fff1e0;
      color: #c2410c;
    }

    .occ-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      margin-bottom: 1rem;
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

    .editor-hint {
      margin: 0 0 1.1rem;
      font-size: 0.8rem;
      line-height: 1.45;
      color: var(--text-secondary);
    }

    .stepper-wrap {
      margin-bottom: 0.85rem;
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
      font-family: inherit;
    }

    .stepper-btn:hover:not(:disabled) {
      background: var(--primary-soft);
      border-color: var(--primary-light);
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
      font-family: inherit;
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

    .editor-empty {
      align-items: center;
      justify-content: center;
      text-align: center;
      color: var(--text-muted);
      min-height: 16rem;
    }

    .editor-empty p {
      margin: 0.75rem 0 0;
      max-width: 16rem;
      font-size: 0.875rem;
      line-height: 1.45;
    }

    .empty-icon {
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: var(--primary-muted);
      color: var(--primary-dark);
    }

    .empty-icon svg {
      width: 24px;
      height: 24px;
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

      .layout {
        grid-template-columns: 1fr;
      }

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
  protected readonly focusedDate = signal<string | null>(null);
  protected draftQuantity = 0;

  protected readonly isMultiUnit = computed(() => this.roomQuantity() > 1);
  protected readonly maxQuantity = computed(() => this.availability()?.room.quantity ?? this.roomQuantity());

  protected readonly blockedList = computed(() => this.availability()?.blocked ?? []);

  protected readonly focusedOccupancy = computed((): RoomDateOccupancy | null => {
    const key = this.focusedDate();
    if (!key) return null;
    const occupancy = this.availability()?.occupancyByDate?.[key];
    if (occupancy) return occupancy;

    const quantity = this.availability()?.room.quantity ?? this.roomQuantity();
    const blocked = this.isServerBlocked(key);
    const booked = (this.availability()?.bookedDates ?? []).includes(key);
    return {
      bookedCount: booked ? quantity : 0,
      availableUnits: blocked || booked ? 0 : quantity,
      quantity,
      blocked,
    };
  });

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
        else if (status === 'partial' || status === 'limited') partial++;
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
    if (this.isMultiUnit()) {
      return cell.status !== 'empty' && cell.status !== 'past' && cell.status !== 'pending';
    }
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
    if (this.isMultiUnit()) return cell.status;
    if (cell.status === 'booked') return 'booked';

    if (this.isDateSelected(cell.key)) {
      return this.isServerBlocked(cell.key) ? 'blocked' : 'selected';
    }

    if (this.isServerBlocked(cell.key)) return 'available';
    return cell.status;
  }

  protected toDate(key: string): Date {
    return parseDateKey(key);
  }

  protected canBlockFocused(): boolean {
    const occupancy = this.focusedOccupancy();
    if (!occupancy || occupancy.blocked) return false;
    return occupancy.availableUnits > 0;
  }

  protected hasOverride(key: string | null): boolean {
    if (!key) return false;
    const occupancy = this.availability()?.occupancyByDate?.[key];
    if (!occupancy) return false;
    if (occupancy.overrideQuantity != null) return true;
    return occupancy.quantity < this.maxQuantity();
  }

  protected minEditableQuantity(): number {
    return Math.max(this.focusedOccupancy()?.bookedCount ?? 0, 0);
  }

  protected canSaveQuantity(): boolean {
    const key = this.focusedDate();
    if (!key || this.isServerBlocked(key)) return false;
    const qty = Number(this.draftQuantity);
    if (!Number.isFinite(qty)) return false;
    if (qty < this.minEditableQuantity() || qty > this.maxQuantity()) return false;
    const current = this.focusedOccupancy()?.quantity ?? this.maxQuantity();
    return qty !== current;
  }

  nudge(delta: number): void {
    this.draftQuantity = Number(this.draftQuantity) + delta;
    this.clampDraft();
  }

  onDraftInput(event: Event): void {
    this.draftQuantity = Number((event.target as HTMLInputElement).value);
    this.clampDraft();
  }

  clampDraft(): void {
    const min = this.minEditableQuantity();
    const max = this.maxQuantity();
    let value = Number(this.draftQuantity);
    if (!Number.isFinite(value)) value = min;
    this.draftQuantity = Math.min(max, Math.max(min, Math.round(value)));
  }

  saveQuantity(): void {
    const key = this.focusedDate();
    if (!key || !this.canSaveQuantity() || this.saving()) return;
    this.applyQuantityOverride(key, Number(this.draftQuantity));
  }

  resetQuantity(): void {
    const key = this.focusedDate();
    if (!key || this.saving()) return;
    this.draftQuantity = this.maxQuantity();
    this.applyQuantityOverride(key, null);
  }

  private applyQuantityOverride(key: string, quantity: number | null): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.roomApi.setQuantityOverrides(this.idOrSlug(), [{ date: key, quantity }]).subscribe({
      next: (calendar) => {
        this.saving.set(false);
        const current = this.availability();
        if (current) {
          this.availability.set(mergeQuantityCalendar(current, calendar));
          this.syncDraftQuantity();
        }
        this.reloadAvailability();
        this.updated.emit();
      },
      error: (err) => {
        this.actionError.set(extractApiError(err, 'Failed to update quantity.'));
        this.saving.set(false);
      },
    });
  }

  protected dayTitle(cell: CalendarDay): string {
    if (this.isMultiUnit()) {
      if (cell.status === 'past') return cell.key || '';
      if (cell.status === 'booked') return `Fully booked ${cell.label ?? ''}`.trim();
      if (cell.status === 'blocked') return `Blocked ${cell.label ?? ''}`.trim();
      if (cell.status === 'limited') return `Limited stock ${cell.label ?? ''}`.trim();
      if (cell.status === 'partial') return `Part booked ${cell.label ?? ''}`.trim();
      return cell.label ? `${cell.label} free — click to manage` : 'Click to manage';
    }
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

    if (this.isMultiUnit()) {
      this.focusedDate.set(cell.key);
      this.syncDraftQuantity(cell.key);
      this.actionError.set(null);
      return;
    }

    this.selectedDates.update((dates) => {
      const next = new Set(dates);
      if (next.has(cell.key!)) next.delete(cell.key!);
      else next.add(cell.key!);
      return next;
    });
    this.actionError.set(null);
  }

  blockFocusedDate(): void {
    const key = this.focusedDate();
    if (!key || !this.canBlockFocused() || this.saving()) return;

    this.saving.set(true);
    this.actionError.set(null);
    this.roomApi
      .addBlockedDates(this.idOrSlug(), {
        blocks: [{ startDate: key, endDate: key }],
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.reloadAvailability();
          this.updated.emit();
        },
        error: (err) => {
          this.actionError.set(extractApiError(err, 'Failed to block date.'));
          this.saving.set(false);
        },
      });
  }

  unblockFocusedDate(): void {
    const key = this.focusedDate();
    if (!key || this.saving()) return;
    const block = this.findBlockForDate(key);
    if (!block?._id) {
      this.actionError.set('Could not find the blocked date to remove.');
      return;
    }

    this.saving.set(true);
    this.actionError.set(null);
    this.roomApi.removeBlockedDate(this.idOrSlug(), block._id).subscribe({
      next: () => {
        this.saving.set(false);
        this.reloadAvailability();
        this.updated.emit();
      },
      error: (err) => {
        this.actionError.set(extractApiError(err, 'Failed to unblock date.'));
        this.saving.set(false);
      },
    });
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

  private syncDraftQuantity(key: string | null = this.focusedDate()): void {
    if (!key) return;
    const occupancy = this.availability()?.occupancyByDate?.[key];
    this.draftQuantity = occupancy?.quantity ?? this.maxQuantity();
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
      quantity: this.roomQuantity() > 1
        ? this.roomApi.getQuantityCalendar(idOrSlug).pipe(catchError(() => of(null)))
        : of(null),
    }).subscribe({
      next: ({ availability, blocked, quantity }) => {
        this.availability.set(
          mergeQuantityCalendar(mergeBlockedDatesIntoAvailability(availability, blocked), quantity),
        );
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
      quantity: this.roomQuantity() > 1
        ? this.roomApi.getQuantityCalendar(idOrSlug).pipe(catchError(() => of(null)))
        : of(null),
    }).subscribe({
      next: ({ availability, blocked, quantity }) => {
        this.availability.set(
          mergeQuantityCalendar(mergeBlockedDatesIntoAvailability(availability, blocked), quantity),
        );
        this.syncSelectedFromAvailability();
        this.syncDraftQuantity();
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

function mergeQuantityCalendar(
  availability: RoomAvailability,
  quantityCal: RoomQuantityCalendar | null | undefined,
): RoomAvailability {
  if (!quantityCal?.occupancyByDate) return availability;
  const current = availability.occupancyByDate ?? {};
  const next: Record<string, RoomDateOccupancy> = { ...current };
  for (const [date, occ] of Object.entries(quantityCal.occupancyByDate)) {
    const key = date.slice(0, 10);
    next[key] = {
      ...current[key],
      ...occ,
      blocked: current[key]?.blocked ?? occ.blocked,
    };
  }
  return { ...availability, occupancyByDate: next };
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
  occupancyByDate: Record<string, RoomDateOccupancy>,
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
    } else if (
      occupancy &&
      (occupancy.overrideQuantity != null || occupancy.quantity < roomQuantity)
    ) {
      status = 'limited';
    } else {
      status = 'available';
    }

    if (roomQuantity > 1 && status !== 'past' && status !== 'pending') {
      if (occupancy) {
        label = `${occupancy.availableUnits}/${occupancy.quantity}`;
      } else if (status === 'blocked' || status === 'booked') {
        label = `0/${roomQuantity}`;
      } else {
        label = `${roomQuantity}/${roomQuantity}`;
      }
    } else if (status === 'partial' && occupancy) {
      label = `${occupancy.availableUnits}/${occupancy.quantity}`;
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
