import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination-bar',
  standalone: true,
  template: `
    @if (totalPages() > 1 || showSinglePage()) {
      <div class="pagination">
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          (click)="previous.emit()"
          [disabled]="page() <= 1 || disabled()"
        >
          Previous
        </button>
        <span class="pagination-meta">
          Page {{ page() }} of {{ totalPages() }}
          @if (total() != null) {
            <span class="pagination-count">· {{ total() }} total</span>
          }
        </span>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          (click)="next.emit()"
          [disabled]="page() >= totalPages() || disabled()"
        >
          Next
        </button>
      </div>
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
}
