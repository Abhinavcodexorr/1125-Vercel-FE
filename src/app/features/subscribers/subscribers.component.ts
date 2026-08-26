import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { SubscribeApiService } from '../../core/services/subscribe-api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginationBarComponent } from '../../shared/components/pagination-bar/pagination-bar.component';
import { ShimmerListComponent } from '../../shared/components/shimmer-list/shimmer-list.component';

@Component({
  selector: 'app-subscribers',
  standalone: true,
  imports: [PageHeaderComponent, EmptyStateComponent, PaginationBarComponent, DatePipe, NgIf, NgFor, ShimmerListComponent],
  templateUrl: './subscribers.component.html',
})
export class SubscribersComponent implements OnInit {
  protected readonly api = inject(SubscribeApiService);

  protected readonly page = signal(1);
  protected readonly limit = 20;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.api
      .load({
        page: this.page(),
        limit: this.limit,
      })
      .subscribe();
  }

  protected prevPage(): void {
    if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
    this.load();
  }

  protected nextPage(): void {
    const meta = this.api.list();
    if (this.page() >= meta.totalPages) return;
    this.page.update((p) => p + 1);
    this.load();
  }

  protected goToPage(page: number): void {
    const meta = this.api.list();
    const next = Math.min(meta.totalPages || 1, Math.max(1, page));
    if (next === this.page()) return;
    this.page.set(next);
    this.load();
  }

  protected trackById(_index: number, item: { id: string }): string {
    return item.id;
  }
}

