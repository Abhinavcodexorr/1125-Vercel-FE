import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { itemStatus } from '../../core/models/status.model';
import { DataService } from '../../core/services/data.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [PageHeaderComponent, EmptyStateComponent, StatusBadgeComponent, RouterLink],
  template: `
    <app-page-header
      title="Categories"
      subtitle="Accommodation types — Deluxe, Standard Room, Chalets."
    >
      <a routerLink="/categories/new" class="btn btn-primary">+ Add category</a>
    </app-page-header>

    <div class="filters card">
      <label class="toggle-deleted">
        <input type="checkbox" [checked]="showDeleted()" (change)="toggleShowDeleted($event)" />
        Show deleted
      </label>
    </div>

    @if (visibleCategories().length === 0) {
      <app-empty-state
        icon="▤"
        title="No categories found"
        message="Create a category or enable 'Show deleted' to view archived items."
      >
        <a routerLink="/categories/new" class="btn btn-primary">Add category</a>
      </app-empty-state>
    } @else {
      <div class="cards">
        @for (cat of visibleCategories(); track cat.id) {
          <article class="card category-card" [class.is-deleted]="cat.isDeleted">
            <div class="card-top">
              <h3>{{ cat.name }}</h3>
              <app-status-badge [status]="itemStatus(cat)" />
            </div>
            <p class="slug">/{{ cat.slug }}</p>
            <p class="desc">{{ cat.description || 'No description' }}</p>
            <div class="meta">
              <span>{{ roomCount(cat.id) }} rooms</span>
            </div>
            <div class="card-actions">
              @if (!cat.isDeleted) {
                <a [routerLink]="['/categories', cat.id, 'edit']" class="btn btn-secondary btn-sm">Edit</a>
                <a routerLink="/rooms/new" class="btn btn-secondary btn-sm">+ Room</a>
                <button type="button" class="btn btn-danger btn-sm" (click)="remove(cat.id)">Delete</button>
              } @else {
                <button type="button" class="btn btn-secondary btn-sm" (click)="restore(cat.id)">Restore</button>
              }
            </div>
          </article>
        }
      </div>
    }
  `,
  styles: `
    .filters {
      padding: 0.875rem 1.125rem;
      margin-bottom: 1.25rem;
    }

    .toggle-deleted {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
    }

    .toggle-deleted input {
      width: auto;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.25rem;
    }

    .category-card {
      padding: 1.25rem;
    }

    .category-card.is-deleted {
      opacity: 0.72;
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.375rem;
    }

    h3 {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 600;
    }

    .slug {
      margin: 0 0 0.5rem;
      font-family: ui-monospace, monospace;
      font-size: 0.75rem;
      color: var(--primary-dark);
    }

    .desc {
      margin: 0 0 1rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.45;
    }

    .meta {
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin-bottom: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-light);
    }

    .card-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  `,
})
export class CategoriesComponent {
  protected readonly data = inject(DataService);
  protected readonly itemStatus = itemStatus;

  protected readonly showDeleted = signal(false);

  protected readonly visibleCategories = computed(() =>
    this.data.filterCategories(this.data.allCategories(), this.showDeleted()),
  );

  roomCount(categoryId: string): number {
    return this.data.getRoomsByCategory(categoryId, this.showDeleted()).length;
  }

  toggleShowDeleted(event: Event): void {
    this.showDeleted.set((event.target as HTMLInputElement).checked);
  }

  remove(id: string): void {
    if (confirm('Soft delete this category? Linked rooms will also be marked isDeleted.')) {
      this.data.softDeleteCategory(id);
    }
  }

  restore(id: string): void {
    this.data.restoreCategory(id);
  }
}
