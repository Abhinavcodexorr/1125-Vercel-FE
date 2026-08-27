import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AdminRoom } from '../../core/models/room.model';
import { RoomApiService } from '../../core/services/room-api.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RoomAvailabilityModalComponent } from './room-availability-modal.component';
import { RoomQuantityModalComponent } from './room-quantity-modal.component';
import { ShimmerListComponent } from '../../shared/components/shimmer-list/shimmer-list.component';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [
    PageHeaderComponent,
    EmptyStateComponent,
    RouterLink,
    AppCurrencyPipe,
    RoomAvailabilityModalComponent,
    RoomQuantityModalComponent,
    ShimmerListComponent,
  ],
  template: `
    <app-page-header title="Rooms">
      <a routerLink="/rooms/new" class="btn btn-primary">+ Add room</a>
    </app-page-header>

    @if (roomApi.error()) {
      <div class="alert alert-error">{{ roomApi.error() }}</div>
    }

    @if (roomApi.loading() && roomApi.rooms().length === 0) {
      <app-shimmer-list variant="cards" [cards]="6" />
    } @else if (roomApi.rooms().length === 0) {
      <app-empty-state icon="⌂" title="No rooms found" message="Add a room to get started.">
        <a routerLink="/rooms/new" class="btn btn-primary">Add room</a>
      </app-empty-state>
    } @else {
      <div class="room-grid">
        @for (room of roomApi.rooms(); track room.id) {
          <article class="room-card">
            <div class="room-image">
              @if (coverImage(room); as src) {
                <img [src]="src" [alt]="room.title" loading="lazy" />
              } @else {
                <div class="no-image">No image</div>
              }

              <span class="status-pill" [class.is-active]="room.isActive" [class.is-inactive]="!room.isActive">
                {{ room.isActive ? 'ACTIVE' : 'INACTIVE' }}
              </span>

              @if (blockedDays(room); as days) {
                <span class="blocked-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M8 3v4M16 3v4M3 10h18" />
                  </svg>
                  {{ days }} day{{ days === 1 ? '' : 's' }} blocked
                </span>
              }
            </div>

            <div class="room-body">
              <div class="title-row">
                <h3>{{ room.title }}</h3>
              </div>

              <ul class="details">
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <circle cx="9" cy="8" r="3" />
                    <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
                    <circle cx="17" cy="9" r="2.4" />
                    <path d="M16.2 14.2c2 .4 3.6 1.8 4.3 4.3" />
                  </svg>
                  <span>{{ guestLabel(room) }}</span>
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path d="M3 12h18v7H3z" />
                    <path d="M5 12V9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3" />
                    <path d="M3 16h18" />
                  </svg>
                  <span>{{ typeLabel(room) }}</span>
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M8 3v4M16 3v4M3 10h18" />
                    <path d="M8 14h3M13 14h3" />
                  </svg>
                  <span>Weekday {{ room.wdPrice | appCurrency: room.currency }}</span>
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
                  </svg>
                  <span>Weekend {{ room.wePrice | appCurrency: room.currency }}</span>
                </li>
              </ul>

              <div class="actions">
                <a [routerLink]="['/rooms', room.id, 'edit']" class="room-btn room-btn-edit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                  Edit
                </a>
                <button type="button" class="room-btn room-btn-avail" (click)="openAvailability(room)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M8 3v4M16 3v4M3 10h18" />
                  </svg>
                  Availability
                </button>
                @if (room.quantity > 1) {
                  <button type="button" class="room-btn room-btn-qty" (click)="openQuantity(room)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M4 7h16M4 12h16M4 17h10" />
                    </svg>
                    Quantity
                  </button>
                }
                @if (room.isActive) {
                  <button type="button" class="room-btn room-btn-deactivate" (click)="deactivate(room.id)">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                    Deactivate
                  </button>
                } @else {
                  <button type="button" class="room-btn room-btn-activate" (click)="activate(room.id)">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M8 5.5v13l11-6.5-11-6.5z" />
                    </svg>
                    Activate
                  </button>
                }
                <button type="button" class="room-btn room-btn-delete" (click)="remove(room.id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </article>
        }
      </div>
    }

    @if (availabilityRoom(); as room) {
      <app-room-availability-modal
        [idOrSlug]="room.slug || room.id"
        [roomTitle]="room.title"
        [roomQuantity]="room.quantity"
        (closed)="closeAvailability()"
        (updated)="onAvailabilityUpdated(room)"
      />
    }

    @if (quantityRoom(); as room) {
      <app-room-quantity-modal
        [idOrSlug]="room.slug || room.id"
        [roomTitle]="room.title"
        [roomQuantity]="room.quantity"
        (closed)="closeQuantity()"
        (updated)="onQuantityUpdated(room)"
      />
    }
  `,
  styles: `
    .room-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.35rem;
    }

    .room-card {
      overflow: hidden;
      background: var(--white);
      border: 1px solid var(--border-light);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
      transition: box-shadow var(--transition), transform var(--transition), border-color var(--transition);
    }

    .room-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-md);
      border-color: var(--border);
    }

    .room-image {
      position: relative;
      height: 198px;
      background: var(--primary-muted);
    }

    .room-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .room-image::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        rgba(26, 43, 60, 0.08) 0%,
        transparent 42%,
        rgba(26, 43, 60, 0.32) 100%
      );
      pointer-events: none;
    }

    .no-image {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .status-pill,
    .blocked-pill {
      position: absolute;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.28rem 0.7rem;
      border-radius: 999px;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      line-height: 1.2;
      color: var(--white);
      box-shadow: 0 1px 4px rgba(26, 43, 60, 0.18);
    }

    .status-pill {
      top: 0.75rem;
      right: 0.75rem;
      text-transform: uppercase;
    }

    .status-pill.is-active {
      background: var(--success);
    }

    .status-pill.is-inactive {
      background: var(--text-muted);
    }

    .blocked-pill {
      left: 0.75rem;
      bottom: 0.75rem;
      background: var(--danger);
      text-transform: none;
      font-weight: 600;
      letter-spacing: 0;
      font-size: 0.75rem;
    }

    .blocked-pill svg {
      width: 0.875rem;
      height: 0.875rem;
    }

    .room-body {
      padding: 1.05rem 1.15rem 1.15rem;
    }

    .title-row {
      margin-bottom: 0.85rem;
    }

    .title-row h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1.3;
    }

    .details {
      list-style: none;
      margin: 0 0 1.1rem;
      padding: 0;
      display: grid;
      gap: 0.55rem;
    }

    .details li {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
      min-width: 0;
    }

    .details svg {
      width: 1.05rem;
      height: 1.05rem;
      flex-shrink: 0;
      color: var(--primary-dark);
    }

    .details span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
      gap: 0.5rem;
    }

    .room-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      min-height: 2.35rem;
      padding: 0.45rem 0.65rem;
      border-radius: var(--radius-xs);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      text-decoration: none;
      transition: background var(--transition), color var(--transition), border-color var(--transition),
        transform var(--transition), box-shadow var(--transition);
    }

    .room-btn svg {
      width: 0.95rem;
      height: 0.95rem;
      flex-shrink: 0;
    }

    .room-btn-edit,
    .room-btn-avail,
    .room-btn-qty,
    .room-btn-deactivate,
    .room-btn-activate,
    .room-btn-delete {
      width: 100%;
      min-width: 0;
    }

    .room-btn-edit {
      background: var(--white);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .room-btn-edit svg {
      color: var(--primary-dark);
    }

    .room-btn-edit:hover {
      border-color: var(--primary);
      background: var(--primary-muted);
    }

    .room-btn-avail {
      background: var(--white);
      color: var(--warning);
      border: 1px solid var(--warning);
    }

    .room-btn-avail:hover {
      background: #fef6e6;
    }

    .room-btn-qty {
      background: var(--white);
      color: var(--primary-dark);
      border: 1px solid var(--primary);
    }

    .room-btn-qty:hover {
      background: var(--primary-soft);
    }

    .room-btn-deactivate {
      background: var(--warning);
      color: var(--white);
      border: 1px solid var(--warning);
    }

    .room-btn-deactivate:hover {
      filter: brightness(0.95);
    }

    .room-btn-activate {
      background: var(--success);
      color: var(--white);
      border: 1px solid var(--success);
    }

    .room-btn-activate:hover {
      filter: brightness(0.95);
    }

    .room-btn-delete {
      background: var(--danger);
      color: var(--white);
      border: 1px solid var(--danger);
    }

    .room-btn-delete:hover {
      filter: brightness(0.95);
    }

    @media (max-width: 480px) {
      .room-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
    }
  `,
})
export class RoomsComponent implements OnInit {
  protected readonly roomApi = inject(RoomApiService);
  private readonly confirmService = inject(ConfirmService);

  protected readonly availabilityRoom = signal<AdminRoom | null>(null);
  protected readonly quantityRoom = signal<AdminRoom | null>(null);
  private readonly blockedByRoomId = signal<Record<string, number>>({});
  private blockedLoadId = 0;

  ngOnInit(): void {
    this.refresh();
  }

  coverImage(room: AdminRoom): string | null {
    const sorted = [...room.images].sort((a, b) => a.order - b.order);
    return sorted[0]?.url ?? null;
  }

  blockedDays(room: AdminRoom): number {
    return this.blockedByRoomId()[room.id] ?? 0;
  }

  guestLabel(room: AdminRoom): string {
    const guests = `${room.guests} guest${room.guests === 1 ? '' : 's'}`;
    if (room.quantity > 1) {
      return `${guests} · ${room.quantity} units`;
    }
    return guests;
  }

  typeLabel(room: AdminRoom): string {
    return room.type?.trim() || `${room.quantity} unit${room.quantity === 1 ? '' : 's'}`;
  }

  refresh(): void {
    this.roomApi.loadAll().subscribe((rooms) => this.loadBlockedCounts(rooms));
  }

  async remove(idOrSlug: string): Promise<void> {
    const ok = await this.confirmService.confirm({
      title: 'Delete room',
      message: 'Soft delete this room? It will be hidden from listings.',
      confirmLabel: 'Delete room',
      variant: 'danger',
    });
    if (ok) {
      this.roomApi.delete(idOrSlug).subscribe();
    }
  }

  activate(idOrSlug: string): void {
    this.roomApi.setStatus(idOrSlug, true).subscribe();
  }

  deactivate(idOrSlug: string): void {
    this.roomApi.setStatus(idOrSlug, false).subscribe();
  }

  openAvailability(room: AdminRoom): void {
    this.quantityRoom.set(null);
    this.availabilityRoom.set(room);
  }

  closeAvailability(): void {
    this.availabilityRoom.set(null);
  }

  openQuantity(room: AdminRoom): void {
    this.availabilityRoom.set(null);
    this.quantityRoom.set(room);
  }

  closeQuantity(): void {
    this.quantityRoom.set(null);
  }

  onAvailabilityUpdated(room: AdminRoom): void {
    this.closeAvailability();
    this.roomApi.refreshOne(room.slug || room.id).subscribe();
    this.refreshBlockedCount(room);
  }

  onQuantityUpdated(_room: AdminRoom): void {
    // Keep modal open after save; parent can refresh list if needed later.
  }

  private loadBlockedCounts(rooms: AdminRoom[]): void {
    const loadId = ++this.blockedLoadId;
    if (rooms.length === 0) {
      this.blockedByRoomId.set({});
      return;
    }

    forkJoin(
      rooms.map((room) =>
        this.roomApi.getBlockedDates(room.slug || room.id).pipe(
          map((data) => ({
            id: room.id,
            count: data.blockedDates?.length ?? data.total ?? 0,
          })),
          catchError(() => of({ id: room.id, count: 0 })),
        ),
      ),
    ).subscribe((rows) => {
      if (loadId !== this.blockedLoadId) return;
      this.blockedByRoomId.set(Object.fromEntries(rows.map((row) => [row.id, row.count])));
    });
  }

  private refreshBlockedCount(room: AdminRoom): void {
    this.roomApi
      .getBlockedDates(room.slug || room.id)
      .pipe(
        map((data) => data.blockedDates?.length ?? data.total ?? 0),
        catchError(() => of(0)),
      )
      .subscribe((count) => {
        this.blockedByRoomId.update((current) => ({ ...current, [room.id]: count }));
      });
  }
}
