import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { SubscribeApiService } from '../../core/services/subscribe-api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-subscribers',
  standalone: true,
  imports: [PageHeaderComponent, EmptyStateComponent, DatePipe, NgIf, NgFor],
  templateUrl: './subscribers.component.html',
  styleUrl: './subscribers.component.scss',
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

  protected trackById(_index: number, item: { id: string }): string {
    return item.id;
  }
}

