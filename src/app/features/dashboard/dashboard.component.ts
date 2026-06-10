import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [PageHeaderComponent, RouterLink, CurrencyPipe, DatePipe],
  template: `
    <app-page-header
      title="Dashboard"
      subtitle="Overview of 1125 Beach Villa — categories, rooms & bookings"
    />

    <div class="stats">
      @for (stat of statCards; track stat.label) {
        <div class="stat card">
          <div class="stat-icon">{{ stat.icon }}</div>
          <div>
            <span class="stat-value">{{ stat.value() }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      }
    </div>

    <div class="grid">
      <section class="card panel">
        <h2>Quick actions</h2>
        <div class="quick">
          <a routerLink="/categories/new" class="quick-item">
            <span>+</span>
            <div>
              <strong>Add category</strong>
              <small>Deluxe, Standard, Chalet</small>
            </div>
          </a>
          <a routerLink="/rooms/new" class="quick-item">
            <span>+</span>
            <div>
              <strong>Add room / villa / chalet</strong>
              <small>Select category first</small>
            </div>
          </a>
        </div>
      </section>

      <section class="card panel">
        <h2>Recent bookings</h2>
        @if (data.bookingsList().length === 0) {
          <p class="muted">No bookings yet.</p>
        } @else {
          <ul class="booking-list">
            @for (b of data.bookingsList().slice(0, 5); track b.id) {
              <li>
                <div>
                  <strong>{{ b.guest.firstName }} {{ b.guest.lastName }}</strong>
                  <small>{{ b.snapshot.roomTitle }}</small>
                </div>
                <div class="booking-meta">
                  <span>{{ b.checkIn | date: 'MMM d' }} – {{ b.checkOut | date: 'MMM d' }}</span>
                  <strong>{{ b.grandTotal | currency: 'INR':'symbol':'1.0-0' }}</strong>
                </div>
              </li>
            }
          </ul>
        }
      </section>
    </div>
  `,
  styles: `
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 1.125rem;
      padding: 1.375rem;
    }

    .stat-icon {
      width: 54px;
      height: 54px;
      background: var(--primary-soft);
      color: var(--primary-dark);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.375rem;
    }

    .stat-value {
      display: block;
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1.2;
    }

    .stat-label {
      font-size: 0.9375rem;
      color: var(--text-secondary);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.25rem;
    }

    .panel {
      padding: 1.5rem;
    }

    h2 {
      margin: 0 0 1.125rem;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .quick {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .quick-item {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.875rem 1rem;
      border-radius: var(--radius-sm);
      background: var(--primary-muted);
      transition: all var(--transition);
    }

    .quick-item:hover {
      background: var(--primary-soft);
      transform: translateX(4px);
    }

    .quick-item span {
      width: 32px;
      height: 32px;
      background: var(--primary);
      color: var(--white);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.125rem;
      font-weight: 300;
    }

    .quick-item strong {
      display: block;
      font-size: 0.875rem;
    }

    .quick-item small {
      color: var(--text-muted);
      font-size: 0.75rem;
    }

    .booking-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .booking-list li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border-light);
    }

    .booking-list li:last-child {
      border-bottom: none;
    }

    .booking-list small {
      display: block;
      color: var(--text-muted);
      font-size: 0.75rem;
    }

    .booking-meta {
      text-align: right;
      font-size: 0.8125rem;
    }

    .booking-meta span {
      display: block;
      color: var(--text-secondary);
      margin-bottom: 0.125rem;
    }

    .muted {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    @media (max-width: 1100px) {
      .stats {
        grid-template-columns: repeat(2, 1fr);
      }
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class DashboardComponent {
  protected readonly data = inject(DataService);

  protected readonly statCards = [
    { label: 'Active categories', icon: '▤', value: () => this.data.stats().categories },
    { label: 'Rooms & villas', icon: '⌂', value: () => this.data.stats().rooms },
    { label: 'Bookings', icon: '☰', value: () => this.data.stats().bookings },
    {
      label: 'Revenue',
      icon: '₹',
      value: () =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
          this.data.stats().revenue,
        ),
    },
  ];
}
