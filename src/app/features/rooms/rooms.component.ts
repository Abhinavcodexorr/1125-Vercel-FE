import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminRoom } from '../../core/models/room.model';
import { itemStatus } from '../../core/models/status.model';
import { RoomApiService } from '../../core/services/room-api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { RoomAvailabilityModalComponent } from './room-availability-modal.component';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [
    PageHeaderComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    RouterLink,
    CurrencyPipe,
    RoomAvailabilityModalComponent,
  ],
  template: `
    <app-page-header title="Rooms & Villas">
      <a routerLink="/rooms/new" class="btn btn-primary">+ Add room</a>
    </app-page-header>

    @if (roomApi.error()) {
      <div class="alert-error">{{ roomApi.error() }}</div>
    }

    <div class="filters card">
      <label>Status</label>
      <select [value]="statusFilter()" (change)="onStatusFilterChange($event)">
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <button type="button" class="btn btn-secondary btn-sm refresh-btn" (click)="refresh()" [disabled]="roomApi.loading()">
        {{ roomApi.loading() ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    @if (roomApi.loading() && roomApi.rooms().length === 0) {
      <app-empty-state icon="⌂" title="Loading rooms…" message="Fetching rooms." />
    } @else if (filteredRooms().length === 0) {
      <app-empty-state icon="⌂" title="No rooms found" message="Add a room or change the filter.">
        <a routerLink="/rooms/new" class="btn btn-primary">Add room</a>
      </app-empty-state>
    } @else {
      <div class="room-grid">
        @for (room of filteredRooms(); track room.id) {
          <article class="room-card card">
            <div class="room-image">
              @if (coverImage(room); as src) {
                <img [src]="src" [alt]="room.title" loading="lazy" />
              } @else {
                <div class="no-image">No image</div>
              }
              <app-status-badge class="status-badge" [status]="itemStatus(room)" />
            </div>

            <div class="room-body">
              <h3>{{ room.title }}</h3>
              <p class="type">{{ room.type }}</p>

              <div class="meta">
                <span>{{ room.guests }} guests</span>
                <span>{{ room.quantity }} unit{{ room.quantity === 1 ? '' : 's' }}</span>
                <span>{{ room.size }} {{ room.unit }}</span>
                <span>{{ room.price | currency: room.currency || 'USD':'symbol':'1.0-0' }}/night</span>
              </div>

              <div class="actions">
                <button type="button" class="btn btn-secondary btn-sm" (click)="openAvailability(room)">
                  Availability
                </button>
                <a [routerLink]="['/rooms', room.id, 'edit']" class="btn btn-secondary btn-sm">Edit</a>
                @if (room.isActive) {
                  <button type="button" class="btn btn-ghost btn-sm" (click)="deactivate(room.id)">
                    Deactivate
                  </button>
                } @else {
                  <button type="button" class="btn btn-ghost btn-sm" (click)="activate(room.id)">
                    Activate
                  </button>
                }
                <button type="button" class="btn btn-danger btn-sm" (click)="remove(room.id)">Delete</button>
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
        (closed)="closeAvailability()"
      />
    }
  `,
  styles: `
    .filters {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
    }

    .filters label {
      font-size: 0.875rem;
      font-weight: 600;
    }

    .filters select {
      min-width: 140px;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--white);
    }

    .refresh-btn {
      margin-left: auto;
    }

    .alert-error {
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      border-radius: var(--radius-sm);
      background: #fdecec;
      color: var(--danger);
      font-size: 0.875rem;
    }

    .room-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.25rem;
    }

    .room-card {
      overflow: hidden;
      padding: 0;
    }

    .room-card:hover {
      transform: translateY(-2px);
    }

    .room-image {
      position: relative;
      height: 180px;
      background: var(--primary-muted);
    }

    .room-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
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

    .status-badge {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
    }

    .room-body {
      padding: 1rem 1.125rem 1.125rem;
    }

    .room-body h3 {
      margin: 0 0 0.25rem;
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--text);
    }

    .type {
      margin: 0 0 0.75rem;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 0.75rem;
      margin-bottom: 1rem;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  `,
})
export class RoomsComponent implements OnInit {
  protected readonly roomApi = inject(RoomApiService);
  protected readonly itemStatus = itemStatus;

  protected readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  protected readonly filteredRooms = computed(() => this.roomApi.rooms());
  protected readonly availabilityRoom = signal<AdminRoom | null>(null);

  ngOnInit(): void {
    this.refresh();
  }

  coverImage(room: AdminRoom): string | null {
    const sorted = [...room.images].sort((a, b) => a.order - b.order);
    return sorted[0]?.url ?? null;
  }

  refresh(): void {
    const filter = this.statusFilter();
    const isActive = filter === 'all' ? undefined : filter === 'active';
    this.roomApi.loadAll(isActive).subscribe();
  }

  onStatusFilterChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as 'all' | 'active' | 'inactive');
    this.refresh();
  }

  remove(idOrSlug: string): void {
    if (confirm('Soft delete this room?')) {
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
    this.availabilityRoom.set(room);
  }

  closeAvailability(): void {
    this.availabilityRoom.set(null);
  }
}
