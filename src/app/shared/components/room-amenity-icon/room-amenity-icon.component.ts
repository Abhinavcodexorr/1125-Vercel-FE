import { Component, input } from '@angular/core';

@Component({
  selector: 'app-room-amenity-icon',
  standalone: true,
  template: `
    <svg
      class="amenity-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (icon()) {
        @case ('hot_cold_shower') {
          <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" />
          <path d="M12 11v2" />
          <path d="M9.5 16.5c.8 1.2 2.2 2 3.5 2s2.7-.8 3.5-2" />
          <path d="M10 14h.01M12 15h.01M14 14h.01" />
        }
        @case ('high_speed_wifi') {
          <path d="M5 9.5c4-3.5 10-3.5 14 0" />
          <path d="M8 13c2.2-2 5.8-2 8 0" />
          <path d="M11 16.5c.8-.7 2.2-.7 3 0" />
          <circle cx="12.5" cy="19" r="1" fill="currentColor" stroke="none" />
        }
        @case ('mini_fridge') {
          <rect x="6" y="3" width="12" height="18" rx="1.5" />
          <path d="M6 10h12" />
          <path d="M9 6.5h.01M9 13.5h.01" />
        }
        @case ('on_request_laundry') {
          <path d="M7 7h10l-1.5 3H8.5L7 7Z" />
          <path d="M8.5 10v8.5c0 1.1.9 2 2 2h3c1.1 0 2-.9 2-2V10" />
        }
        @case ('air_conditioning') {
          <path d="M5 8c2.5-1.5 5.5-1.5 8 0" />
          <path d="M5 12c2.5-1.5 5.5-1.5 8 0" />
          <path d="M5 16c2.5-1.5 5.5-1.5 8 0" />
        }
        @case ('equipped_kitchenette') {
          <rect x="5" y="8" width="14" height="11" rx="1.5" />
          <path d="M8 8V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
          <path d="M9 12h6M9 15h4" />
        }
        @case ('flat_screen_tv') {
          <rect x="4" y="6" width="16" height="11" rx="1.5" />
          <path d="M10 20h4" />
          <path d="M12 17v3" />
        }
        @case ('butler_service') {
          <circle cx="12" cy="8" r="3" />
          <path d="M6 20c.8-3 2.8-5 6-5s5.2 2 6 5" />
          <path d="M17 9h2.5M17 12h2" />
        }
        @default {
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .amenity-svg {
      width: 1.5rem;
      height: 1.5rem;
      display: block;
    }
  `,
})
export class RoomAmenityIconComponent {
  readonly icon = input.required<string>();
}
