import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-shimmer-list',
  standalone: true,
  template: `
    @if (variant() === 'cards') {
      <div class="shimmer-grid" aria-hidden="true">
        @for (card of cardItems(); track card) {
          <article class="shimmer-card">
            <div class="block image"></div>
            <div class="body">
              <div class="line w-70"></div>
              <div class="line w-45"></div>
              <div class="line w-85"></div>
              <div class="chips">
                <span class="chip"></span>
                <span class="chip"></span>
                <span class="chip"></span>
              </div>
            </div>
          </article>
        }
      </div>
    } @else {
      <div class="shimmer-table" [style.--shimmer-cols]="columns()" aria-hidden="true">
        <div class="head">
          @for (col of colItems(); track col) {
            <span class="line head-line"></span>
          }
        </div>
        @for (row of rowItems(); track row) {
          <div class="row">
            @for (col of colItems(); track col) {
              <span class="line" [class.w-55]="col % 3 === 0" [class.w-75]="col % 3 === 1"></span>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    .block,
    .line,
    .chip {
      background: linear-gradient(
        90deg,
        var(--primary-muted) 25%,
        var(--primary-soft) 50%,
        var(--primary-muted) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.2s ease-in-out infinite;
    }

    .shimmer-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.35rem;
    }

    .shimmer-card {
      overflow: hidden;
      background: var(--white);
      border: 1px solid var(--border-light);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
    }

    .block.image {
      height: 11.5rem;
    }

    .body {
      display: grid;
      gap: 0.7rem;
      padding: 1rem 1.1rem 1.15rem;
    }

    .line {
      display: block;
      height: 0.85rem;
      border-radius: 999px;
      width: 100%;
    }

    .chips {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }

    .chip {
      height: 1.7rem;
      width: 4.6rem;
      border-radius: 0.5rem;
    }

    .shimmer-table {
      background: var(--white);
      border: 1px solid var(--border-light);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }

    .head,
    .row {
      display: grid;
      grid-template-columns: repeat(var(--shimmer-cols, 6), minmax(0, 1fr));
      gap: 1rem;
      align-items: center;
      padding: 0.95rem 1.1rem;
    }

    .head {
      border-bottom: 1px solid var(--border);
      background: #f7f9fb;
    }

    .row {
      border-bottom: 1px solid var(--border-light);
    }

    .row:last-child {
      border-bottom: none;
    }

    .head-line {
      height: 0.65rem;
      width: 58%;
    }

    .w-45 { width: 45%; }
    .w-55 { width: 55%; }
    .w-70 { width: 70%; }
    .w-75 { width: 75%; }
    .w-85 { width: 85%; }

    @keyframes shimmer {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }

    @media (max-width: 720px) {
      .shimmer-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ShimmerListComponent {
  readonly variant = input<'table' | 'cards'>('table');
  readonly rows = input(8);
  readonly columns = input(6);
  readonly cards = input(6);

  protected readonly rowItems = computed(() => Array.from({ length: this.rows() }, (_, i) => i));
  protected readonly colItems = computed(() => Array.from({ length: this.columns() }, (_, i) => i));
  protected readonly cardItems = computed(() => Array.from({ length: this.cards() }, (_, i) => i));
}
