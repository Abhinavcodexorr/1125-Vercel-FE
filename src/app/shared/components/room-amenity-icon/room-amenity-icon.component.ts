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
        @case ('pool') {
          <path d="M4 16c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0" />
          <path d="M4 20c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0" />
          <path d="M7 7c0-1.7 1.3-3 3-3s3 1.3 3 3-3 4-3 4" />
        }
        @case ('ocean_view') {
          <path d="M3 16c2.5-2 5.5-2 8 0 2.5 2 5.5 2 8 0" />
          <path d="M4 8l4 3 4-5 4 4 4-2" />
        }
        @case ('private_deck') {
          <path d="M4 14h16" />
          <path d="M6 14v5M18 14v5" />
          <path d="M4 19h16" />
          <path d="M8 10l4-5 4 5" />
        }
        @case ('lounge_access') {
          <path d="M5 14h14v3H5z" />
          <path d="M7 14V11a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v3" />
          <path d="M6 17v2M18 17v2" />
        }
        @case ('game_room') {
          <path d="M7 15.5c-1.7 0-3-1.1-3-2.5S5.3 10.5 7 10.5h10c1.7 0 3 1.1 3 2.5s-1.3 2.5-3 2.5H7Z" />
          <path d="M9 12.2v2.6M7.7 13.5h2.6" />
          <circle cx="15.2" cy="12.6" r="0.7" fill="currentColor" stroke="none" />
          <circle cx="16.8" cy="14.2" r="0.7" fill="currentColor" stroke="none" />
        }
        @case ('bed') {
          <path d="M4 18V10a2 2 0 0 1 2-2h5a3 3 0 0 1 3 3v7" />
          <path d="M14 18V12h4a2 2 0 0 1 2 2v4" />
          <path d="M3 18h18" />
        }
        @case ('star') {
          <path d="M12 4.5l1.8 3.7 4.1.6-3 2.9.7 4.1L12 14.8 8.4 15.8l.7-4.1-3-2.9 4.1-.6L12 4.5Z" />
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
