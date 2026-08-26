import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination-bar',
  standalone: true,
  template: `
    @if (totalPages() > 1 || showSinglePage()) {
      <div class="pager">
        <span class="pager-total">Total Records: {{ total() ?? 0 }}</span>
        <div class="pager-controls">
          <button
            type="button"
            class="pager-btn"
            (click)="goTo.emit(1)"
            [disabled]="page() <= 1 || disabled()"
            aria-label="First page"
          >
            |&lt;
          </button>
          <button
            type="button"
            class="pager-btn"
            (click)="previous.emit()"
            [disabled]="page() <= 1 || disabled()"
            aria-label="Previous page"
          >
            &lt;
          </button>
          @for (item of pageItems(); track $index) {
            @if (item === '…') {
              <span class="pager-ellipsis">…</span>
            } @else {
              <button
                type="button"
                class="pager-btn pager-num"
                [class.active]="item === page()"
                (click)="selectPage(item)"
                [disabled]="disabled()"
              >
                {{ item }}
              </button>
            }
          }
          <button
            type="button"
            class="pager-btn"
            (click)="next.emit()"
            [disabled]="page() >= totalPages() || disabled()"
            aria-label="Next page"
          >
            &gt;
          </button>
          <button
            type="button"
            class="pager-btn"
            (click)="goTo.emit(totalPages())"
            [disabled]="page() >= totalPages() || disabled()"
            aria-label="Last page"
          >
            &gt;|
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .pager {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
      padding: 0.65rem 1rem;
      background: var(--white);
    }

    .pager-total {
      font-size: 0.8125rem;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .pager-controls {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-left: auto;
    }

    .pager-btn {
      min-width: 2rem;
      height: 2rem;
      padding: 0 0.45rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--white);
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      line-height: 1;
    }

    .pager-btn:hover:not(:disabled):not(.active) {
      border-color: var(--primary);
      color: var(--primary-dark);
    }

    .pager-btn.active {
      background: var(--btn-primary-bg);
      border-color: var(--btn-primary-bg);
      color: var(--white);
    }

    .pager-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .pager-ellipsis {
      padding: 0 0.2rem;
      color: var(--text-muted);
      font-size: 0.875rem;
    }
  `,
})
export class PaginationBarComponent {
  readonly page = input(1);
  readonly totalPages = input(1);
  readonly total = input<number | null>(null);
  readonly disabled = input(false);
  readonly showSinglePage = input(false);

  readonly previous = output<void>();
  readonly next = output<void>();
  readonly goTo = output<number>();

  protected readonly pageItems = computed(() => this.buildPageItems(this.page(), this.totalPages()));

  protected selectPage(page: number | '…'): void {
    if (page === '…' || page === this.page() || this.disabled()) return;
    this.goTo.emit(page);
  }

  private buildPageItems(current: number, total: number): Array<number | '…'> {
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    const items: Array<number | '…'> = [1];
    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);

    if (current <= 3) {
      start = 2;
      end = 5;
    } else if (current >= total - 2) {
      start = total - 4;
      end = total - 1;
    }

    if (start > 2) items.push('…');
    for (let page = start; page <= end; page++) items.push(page);
    if (end < total - 1) items.push('…');
    items.push(total);
    return items;
  }
}
