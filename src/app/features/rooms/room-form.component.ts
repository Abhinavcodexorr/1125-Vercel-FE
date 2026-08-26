import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  CURRENCY_OPTIONS,
  currencyDisplaySymbol,
  normalizeCurrencyCode,
} from '../../core/constants/currencies';
import {
  CUSTOM_AMENITY_ICON_OPTIONS,
  findPredefinedAmenity,
  PREDEFINED_ROOM_AMENITIES,
  svgIconForApiIcon,
  toAmenityPayload,
} from '../../core/constants/room-amenities';
import { RoomAmenity, RoomCreatePayload, RoomImage, RoomUpdatePayload } from '../../core/models/room.model';
import { RoomApiService } from '../../core/services/room-api.service';
import { UploadService } from '../../core/services/upload.service';
import { RoomAmenityIconComponent } from '../../shared/components/room-amenity-icon/room-amenity-icon.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ShimmerListComponent } from '../../shared/components/shimmer-list/shimmer-list.component';

@Component({
  selector: 'app-room-form',
  standalone: true,
  imports: [PageHeaderComponent, ReactiveFormsModule, RouterLink, RoomAmenityIconComponent, ShimmerListComponent],
  template: `
    <div class="room-form-page">
      <app-page-header
        [title]="isEdit ? 'Update room' : 'Add room'"
        [subtitle]="isEdit ? 'Change photos, details, and pricing.' : 'Add photos, details, and pricing in one place.'"
        [showDivider]="false"
      >
        <a routerLink="/rooms" class="btn btn-ghost">Cancel</a>
        <button
          type="submit"
          form="room-form"
          class="btn btn-primary"
          [disabled]="loading() || form.invalid || saving() || uploading()"
        >
          {{ saving() ? 'Saving…' : isEdit ? 'Update room' : 'Add room' }}
        </button>
      </app-page-header>

      @if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      }

      @if (loading()) {
        <app-shimmer-list variant="cards" [cards]="2" />
      } @else {
        <form id="room-form" class="form-shell" [formGroup]="form" (ngSubmit)="save()" novalidate>
          <section class="panel card">
            <div class="panel-head">
              <div>
                <h2>Photos</h2>
                <p>First photo is the cover. Use arrows to reorder.</p>
              </div>
              <input #fileInput type="file" accept="image/*" multiple class="file-input" (change)="onFilesSelected($event)" />
              <button type="button" class="btn btn-secondary btn-sm" (click)="fileInput.click()" [disabled]="uploading()">
                {{ uploading() ? 'Uploading…' : '+ Upload photos' }}
              </button>
            </div>

            @if (uploadError()) {
              <div class="alert alert-error">{{ uploadError() }}</div>
            }

            @if (images().length > 0) {
              <ul class="image-grid">
                @for (img of images(); track img.url; let i = $index) {
                  <li class="image-card" [class.is-cover]="i === 0">
                    <img [src]="img.url" alt="Room photo {{ i + 1 }}" />
                    @if (i === 0) {
                      <span class="cover-badge">Cover</span>
                    }
                    <div class="image-tools">
                      <button type="button" (click)="moveImage(i, -1)" [disabled]="i === 0" aria-label="Move earlier">‹</button>
                      <span>{{ i + 1 }}</span>
                      <button type="button" (click)="moveImage(i, 1)" [disabled]="i === images().length - 1" aria-label="Move later">›</button>
                    </div>
                    <button type="button" class="remove-btn" (click)="removeImage(img.url)" aria-label="Remove">×</button>
                  </li>
                }
              </ul>
            } @else {
              <button type="button" class="dropzone" (click)="fileInput.click()">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h2.1l.7-1.2A1.5 1.5 0 0 1 10.6 3h2.8c.5 0 1 .26 1.28.7L15.4 5h2.1A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" fill="none" stroke="currentColor" stroke-width="1.6"/>
                  <circle cx="12" cy="12.2" r="3.1" fill="none" stroke="currentColor" stroke-width="1.6"/>
                </svg>
                <strong>Drop or click to add photos</strong>
                <span>JPG or PNG. The first image becomes the listing cover.</span>
              </button>
            }
          </section>

          <section class="panel card details-panel">
            <div class="grid-2">
              <div class="form-group compact">
                <label>Title *</label>
                <input formControlName="title" placeholder="The Villa" />
              </div>
              <div class="form-group compact">
                <label>Type *</label>
                <input formControlName="type" placeholder="5-Bedroom Beach Residence" />
              </div>
            </div>
            <div class="form-group compact">
              <label>Description</label>
              <textarea formControlName="description" rows="4" placeholder="What makes this stay special?"></textarea>
            </div>
          </section>

          <section class="panel card">
            <div class="panel-head">
              <div>
                <h2>Stay details</h2>
                <p>How many people and units.</p>
              </div>
            </div>

            <div class="stay-row">
              <div class="form-group compact guests-field">
                <label>Guests *</label>
                <input type="number" formControlName="guests" min="1" />
              </div>
              <div class="form-group compact quantity-field">
                <label>Quantity</label>
                <div class="quantity-stepper">
                  <button type="button" class="stepper-btn" (click)="adjustQuantity(-1)" [disabled]="form.controls.quantity.value <= 1" aria-label="Decrease quantity">−</button>
                  <input type="number" formControlName="quantity" min="1" (blur)="clampQuantity()" />
                  <button type="button" class="stepper-btn" (click)="adjustQuantity(1)" aria-label="Increase quantity">+</button>
                </div>
              </div>
            </div>

            <div class="bed-config">
              <label>Bed configuration</label>
              @if (bedPreview()) {
                <div class="bed-selected" aria-live="polite">
                  @for (item of selectedBeds(); track item.type) {
                    <span class="bed-chip">{{ item.count }} {{ item.type }}</span>
                  }
                  @if (bedroomCount() > 0) {
                    <span class="bed-chip rooms">{{ bedroomCount() }} bedroom{{ bedroomCount() === 1 ? '' : 's' }}</span>
                  }
                </div>
              } @else {
                <p class="bed-selected-empty">Choose beds and bedrooms. Only what you pick is saved.</p>
              }
              <div class="bed-options">
                @for (bedType of bedTypes; track bedType) {
                  <div class="bed-option" [class.is-selected]="bedCount(bedType) > 0">
                    <span>{{ bedType }}</span>
                    <div class="quantity-stepper">
                      <button type="button" class="stepper-btn" (click)="adjustBedCount(bedType, -1)" [disabled]="bedCount(bedType) <= 0" [attr.aria-label]="'Decrease ' + bedType">−</button>
                      <span class="stepper-value">{{ bedCount(bedType) }}</span>
                      <button type="button" class="stepper-btn" (click)="adjustBedCount(bedType, 1)" [attr.aria-label]="'Increase ' + bedType">+</button>
                    </div>
                  </div>
                }
              </div>
              <div class="bed-option bedrooms" [class.is-selected]="bedroomCount() > 0">
                <span>Bedrooms</span>
                <div class="quantity-stepper">
                  <button type="button" class="stepper-btn" (click)="adjustBedrooms(-1)" [disabled]="bedroomCount() <= 0" aria-label="Decrease bedrooms">−</button>
                  <span class="stepper-value">{{ bedroomCount() }}</span>
                  <button type="button" class="stepper-btn" (click)="adjustBedrooms(1)" aria-label="Increase bedrooms">+</button>
                </div>
              </div>
            </div>
          </section>

          <section class="panel card">
            <div class="panel-head">
              <div>
                <h2>Pricing</h2>
                <p>Weekday and weekend rates.</p>
              </div>
            </div>

            <div class="pricing-row">
              <div class="form-group compact currency-field">
                <label>Currency *</label>
                <select formControlName="currency" class="form-select">
                  @for (option of currencyOptions; track option.code) {
                    <option [value]="option.code">{{ option.code }}</option>
                  }
                </select>
              </div>
              <div class="form-group compact price-field">
                <label>Weekday *</label>
                <div class="input-with-symbol" [class.symbol-wide]="priceSymbol().length > 1">
                  <span class="symbol">{{ priceSymbol() }}</span>
                  <input type="number" formControlName="wdPrice" min="0" />
                </div>
              </div>
              <div class="form-group compact price-field">
                <label>Weekend *</label>
                <div class="input-with-symbol" [class.symbol-wide]="priceSymbol().length > 1">
                  <span class="symbol">{{ priceSymbol() }}</span>
                  <input type="number" formControlName="wePrice" min="0" />
                </div>
              </div>
            </div>
          </section>

          <section class="panel card">
            <div class="panel-head">
              <div>
                <h2>Amenities</h2>
                <p>Tap to select what this room includes.</p>
              </div>
            </div>

            <div class="amenities-grid" role="group" aria-label="Room amenities">
              @for (amenity of predefinedAmenities; track amenity.key) {
                <button
                  type="button"
                  class="amenity-option"
                  [class.selected]="isAmenitySelected(amenity.key)"
                  [attr.aria-pressed]="isAmenitySelected(amenity.key)"
                  (click)="toggleAmenity(amenity.key)"
                >
                  <span class="amenity-icon-wrap">
                    <app-room-amenity-icon [icon]="amenity.icon" />
                  </span>
                  <span>{{ amenity.name }}</span>
                </button>
              }
            </div>

            <div class="custom-amenities">
              <p class="custom-label">Other amenities</p>
              <div class="custom-add">
                <input
                  formControlName="extraAmenityName"
                  placeholder="Name, e.g. Coffee machine"
                  (keydown.enter)="$event.preventDefault(); addCustomAmenity()"
                />
                <div class="icon-picks" role="group" aria-label="Icon for other amenity">
                  @for (option of customIconOptions; track option.value) {
                    <button
                      type="button"
                      class="icon-pick"
                      [class.selected]="customAmenityIcon() === option.value"
                      [attr.aria-label]="option.label"
                      (click)="customAmenityIcon.set(option.value)"
                    >
                      <app-room-amenity-icon [icon]="option.svg" />
                    </button>
                  }
                </div>
                <button type="button" class="btn btn-secondary btn-sm" (click)="addCustomAmenity()" [disabled]="!form.controls.extraAmenityName.value.trim()">
                  Add
                </button>
              </div>
              @if (customAmenities().length) {
                <ul class="custom-chips">
                  @for (amenity of customAmenities(); track amenity.name) {
                    <li>
                      <app-room-amenity-icon [icon]="svgIconForApiIcon(amenity.icon)" />
                      <span>{{ amenity.name }}</span>
                      <button type="button" (click)="removeCustomAmenity(amenity.name)" aria-label="Remove {{ amenity.name }}">×</button>
                    </li>
                  }
                </ul>
              }
            </div>
          </section>

          <section class="panel card status-panel">
            <label class="status-toggle">
              <input type="checkbox" formControlName="isActive" />
              <span class="switch" aria-hidden="true"></span>
              <span class="status-copy">
                <strong>{{ form.controls.isActive.value ? 'Active listing' : 'Inactive listing' }}</strong>
                <small>{{ form.controls.isActive.value ? 'Visible on the public site.' : 'Hidden from the public site.' }}</small>
              </span>
            </label>
            <div class="footer-actions">
              <a routerLink="/rooms" class="btn btn-ghost">Cancel</a>
              <button type="submit" class="btn btn-primary" [disabled]="form.invalid || saving() || uploading()">
                {{ saving() ? 'Saving…' : isEdit ? 'Update room' : 'Add room' }}
              </button>
            </div>
          </section>
        </form>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      min-width: 0;
    }

    .room-form-page {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .form-shell {
      display: grid;
      gap: 1.1rem;
    }

    .panel {
      padding: 1.35rem 1.5rem 1.5rem;
    }

    .panel-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.15rem;
    }

    .panel-head h2 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text);
    }

    .panel-head p {
      margin: 0.25rem 0 0;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .details-panel {
      display: grid;
      gap: 1rem;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem 1.15rem;
    }

    .pricing-row,
    .stay-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem 1.15rem;
      align-items: end;
    }

    .currency-field {
      width: 6.5rem;
    }

    .price-field {
      width: 9.75rem;
    }

    .guests-field {
      width: 6.75rem;
    }

    .quantity-field {
      width: 8.75rem;
    }

    .quantity-field .quantity-stepper {
      width: 100%;
    }

    :host .form-group.compact {
      margin-bottom: 0;
    }

    :host .form-group.compact label {
      margin-bottom: 0.35rem;
      font-size: 0.8125rem;
    }

    :host .form-group.compact input,
    :host .form-group.compact textarea,
    :host .form-group.compact .form-select {
      padding: 0.7rem 0.9rem;
      font-size: 0.9rem;
    }

    :host .form-group.compact textarea {
      min-height: 6.5rem;
      resize: vertical;
    }

    .form-select {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--white);
      color: var(--text);
      cursor: pointer;
    }

    .form-select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(124, 165, 200, 0.2);
    }

    .quantity-stepper {
      display: flex;
      align-items: stretch;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: var(--white);
    }

    .quantity-stepper input {
      flex: 1;
      min-width: 0;
      border: none;
      border-radius: 0;
      text-align: center;
      -moz-appearance: textfield;
      appearance: textfield;
    }

    .quantity-stepper input::-webkit-outer-spin-button,
    .quantity-stepper input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .stepper-btn {
      width: 2.2rem;
      border: none;
      background: var(--primary-muted);
      color: var(--text);
      font-size: 1.05rem;
      font-weight: 700;
      cursor: pointer;
    }

    .stepper-btn:hover:not(:disabled) {
      background: var(--primary-light);
    }

    .stepper-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .input-with-symbol {
      position: relative;
    }

    .input-with-symbol .symbol {
      position: absolute;
      left: 0.9rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--text-muted);
      pointer-events: none;
    }

    :host .form-group.compact .input-with-symbol input {
      padding-left: 2.1rem;
    }

    :host .form-group.compact .input-with-symbol.symbol-wide input {
      padding-left: 2.85rem;
    }

    .file-input {
      display: none;
    }

    .dropzone {
      width: 100%;
      min-height: 10.5rem;
      border: 1.5px dashed #b3cce0;
      border-radius: var(--radius);
      background: var(--primary-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .dropzone svg {
      width: 2.1rem;
      height: 2.1rem;
      color: var(--primary-dark);
      margin-bottom: 0.2rem;
    }

    .dropzone strong {
      font-size: 0.95rem;
      color: var(--text);
    }

    .dropzone span {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
      gap: 0.85rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .image-card {
      position: relative;
      aspect-ratio: 4 / 3;
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid var(--border-light);
    }

    .image-card.is-cover {
      box-shadow: 0 0 0 2px var(--primary);
    }

    .image-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .cover-badge {
      position: absolute;
      top: 0.45rem;
      left: 0.45rem;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      background: var(--primary);
      color: var(--white);
      font-size: 0.6875rem;
      font-weight: 700;
    }

    .image-tools {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.4rem;
      background: linear-gradient(180deg, transparent, rgba(26, 43, 60, 0.78));
      color: var(--white);
      font-size: 0.75rem;
      font-weight: 700;
    }

    .image-tools button {
      width: 1.55rem;
      height: 1.55rem;
      border: none;
      border-radius: 0.35rem;
      background: rgba(255, 255, 255, 0.95);
      color: var(--text);
      cursor: pointer;
    }

    .image-tools button:disabled {
      opacity: 0.35;
    }

    .remove-btn {
      position: absolute;
      top: 0.4rem;
      right: 0.4rem;
      width: 1.5rem;
      height: 1.5rem;
      border: none;
      border-radius: 999px;
      background: rgba(26, 43, 60, 0.7);
      color: var(--white);
      cursor: pointer;
    }

    .amenities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 0.65rem;
      margin-bottom: 1.15rem;
    }

    .amenity-option {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      min-height: 3rem;
      padding: 0.55rem 0.75rem;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      background: var(--white);
      color: var(--text);
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
    }

    .amenity-option:hover {
      border-color: var(--primary-light);
      background: var(--primary-muted);
    }

    .amenity-option.selected {
      border-color: var(--primary);
      background: var(--primary-muted);
      box-shadow: inset 0 0 0 1px rgba(124, 165, 200, 0.35);
    }

    .amenity-icon-wrap {
      display: inline-flex;
      color: var(--primary-dark);
    }

    .custom-amenities {
      display: grid;
      gap: 0.7rem;
      padding-top: 0.35rem;
      border-top: 1px solid var(--border-light);
    }

    .custom-label {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--text);
    }

    .custom-add {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.55rem;
    }

    .custom-add input {
      flex: 1 1 12rem;
      min-width: 0;
      padding: 0.65rem 0.85rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font: inherit;
      font-size: 0.875rem;
    }

    .icon-picks {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .icon-pick {
      width: 2.15rem;
      height: 2.15rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      background: var(--white);
      color: var(--primary-dark);
      cursor: pointer;
    }

    .icon-pick.selected {
      border-color: var(--primary);
      background: var(--primary-muted);
    }

    .custom-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .custom-chips li {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.45rem 0.35rem 0.55rem;
      border-radius: 999px;
      background: var(--primary-muted);
      color: var(--text);
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .custom-chips li button {
      width: 1.25rem;
      height: 1.25rem;
      border: none;
      border-radius: 999px;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
    }

    .bed-config {
      margin-top: 1.15rem;
      display: grid;
      gap: 0.7rem;
    }

    .bed-config > label {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .bed-selected {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .bed-chip {
      display: inline-flex;
      align-items: center;
      min-height: 1.75rem;
      padding: 0.15rem 0.75rem;
      border-radius: 999px;
      background: var(--primary-muted);
      border: 1px solid var(--primary);
      color: var(--text);
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .bed-chip.rooms {
      background: var(--white);
    }

    .bed-selected-empty {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .bed-options {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0.65rem;
    }

    .bed-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      min-height: 3rem;
      padding: 0.45rem 0.55rem 0.45rem 0.75rem;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      background: var(--white);
      color: var(--text);
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .bed-option.is-selected {
      border-color: var(--primary);
      background: var(--primary-muted);
      box-shadow: 0 0 0 3px rgba(124, 165, 200, 0.2);
    }

    .bed-option.bedrooms {
      max-width: 16rem;
    }

    .bed-option .quantity-stepper {
      width: 6.6rem;
      flex-shrink: 0;
    }

    .bed-option.is-selected .quantity-stepper {
      border-color: var(--primary-light);
    }

    .stepper-value {
      flex: 1;
      min-width: 1.6rem;
      text-align: center;
      font-size: 0.9rem;
      font-weight: 700;
      line-height: 2.2rem;
    }

    .status-panel {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .status-toggle {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.8rem;
      cursor: pointer;
    }

    .status-toggle input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .switch {
      width: 2.4rem;
      height: 1.35rem;
      flex-shrink: 0;
      border-radius: 999px;
      background: #c9d6e3;
      position: relative;
      transition: background 0.15s ease;
    }

    .switch::after {
      content: '';
      position: absolute;
      top: 0.15rem;
      left: 0.15rem;
      width: 1.05rem;
      height: 1.05rem;
      border-radius: 50%;
      background: var(--white);
      box-shadow: 0 1px 3px rgba(26, 43, 60, 0.25);
      transition: transform 0.15s ease;
    }

    .status-toggle input:checked + .switch {
      background: var(--success);
    }

    .status-toggle input:checked + .switch::after {
      transform: translateX(1.05rem);
    }

    .status-copy {
      display: grid;
      gap: 0.15rem;
    }

    .status-toggle small {
      color: var(--text-muted);
      font-size: 0.8125rem;
    }

    .footer-actions {
      display: flex;
      gap: 0.65rem;
      margin-left: auto;
    }

    @media (max-width: 640px) {
      .grid-2 {
        grid-template-columns: 1fr;
      }

      .panel-head,
      .status-panel,
      .footer-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .footer-actions {
        margin-left: 0;
      }
    }
  `,
})
export class RoomFormComponent implements OnInit {
  private readonly roomApi = inject(RoomApiService);
  private readonly uploadService = inject(UploadService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly currencyOptions = CURRENCY_OPTIONS;

  protected readonly predefinedAmenities = PREDEFINED_ROOM_AMENITIES;
  protected readonly customIconOptions = CUSTOM_AMENITY_ICON_OPTIONS;
  protected readonly selectedAmenityKeys = signal<Set<string>>(new Set());
  protected readonly customAmenities = signal<{ name: string; icon: string }[]>([]);
  protected readonly customAmenityIcon = signal<(typeof CUSTOM_AMENITY_ICON_OPTIONS)[number]['value']>('star');
  protected readonly svgIconForApiIcon = svgIconForApiIcon;

  protected readonly bedTypes = ['King', 'Queen', 'Double', 'Twin', 'Single', 'Sofa bed'] as const;
  protected readonly bedCounts = signal<Record<string, number>>({
    King: 0,
    Queen: 0,
    Double: 0,
    Twin: 0,
    Single: 0,
    'Sofa bed': 0,
  });
  protected readonly bedroomCount = signal(0);
  protected readonly selectedBeds = computed(() =>
    this.bedTypes
      .filter((type) => (this.bedCounts()[type] ?? 0) > 0)
      .map((type) => ({ type, count: this.bedCounts()[type] })),
  );
  protected readonly priceSymbol = signal('$');

  protected isEdit = false;
  private roomIdOrSlug = '';

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly images = signal<RoomImage[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    type: ['', Validators.required],
    title: ['', Validators.required],
    description: [''],
    guests: [2, [Validators.required, Validators.min(1)]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    price: [0, [Validators.min(0)]],
    wdPrice: [0, [Validators.required, Validators.min(0)]],
    wePrice: [0, [Validators.required, Validators.min(0)]],
    size: [1],
    unit: ['sq ft'],
    currency: ['USD', Validators.required],
    bedConfiguration: [''],
    extraAmenityName: [''],
    isActive: [true],
  });

  ngOnInit(): void {
    this.syncPriceSymbol(this.form.controls.currency.value);
    this.form.controls.currency.valueChanges.subscribe((code) => this.syncPriceSymbol(code));

    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isEdit = true;
      this.roomIdOrSlug = id;
      this.loading.set(true);
      this.roomApi.getOne(id).subscribe({
        next: (room) => {
          this.form.patchValue({
            type: room.type,
            title: room.title,
            description: room.description,
            guests: room.guests,
            quantity: room.quantity ?? 1,
            price: room.price,
            wdPrice: room.wdPrice ?? room.price,
            wePrice: room.wePrice ?? room.price,
            size: room.size > 0 ? room.size : 1,
            unit: normalizeUnit(room.unit),
            currency: normalizeCurrencyCode(room.currency),
            bedConfiguration: room.bedConfiguration ?? '',
            isActive: room.isActive,
          });
          this.applyBedConfiguration(room.bedConfiguration ?? '');
          this.applyAmenitiesFromRoom(room.amenities);
          this.syncPriceSymbol(normalizeCurrencyCode(room.currency));
          this.images.set([...room.images].sort((a, b) => a.order - b.order));
          this.roomIdOrSlug = room.id || room.slug;
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load room.');
          this.loading.set(false);
          this.router.navigate(['/rooms']);
        },
      });
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';

    if (!files.length) return;

    this.uploading.set(true);
    this.uploadError.set(null);

    const startOrder = this.images().length;
    this.uploadService.uploadRoomImages(files, startOrder).subscribe({
      next: (uploaded) => {
        this.images.update((list) => [...list, ...uploaded].sort((a, b) => a.order - b.order));
        this.uploading.set(false);
      },
      error: (err: Error) => {
        this.uploadError.set(err.message);
        this.uploading.set(false);
      },
    });
  }

  removeImage(url: string): void {
    this.images.update((list) =>
      list.filter((img) => img.url !== url).map((img, order) => ({ ...img, order })),
    );
  }

  moveImage(index: number, direction: -1 | 1): void {
    this.images.update((list) => {
      const target = index + direction;
      if (target < 0 || target >= list.length) return list;

      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((img, order) => ({ ...img, order }));
    });
  }

  protected isAmenitySelected(key: string): boolean {
    return this.selectedAmenityKeys().has(key);
  }

  protected toggleAmenity(key: string): void {
    this.selectedAmenityKeys.update((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  protected adjustQuantity(delta: number): void {
    const control = this.form.controls.quantity;
    const current = control.value ?? 1;
    control.setValue(Math.max(1, current + delta));
  }

  protected clampQuantity(): void {
    const control = this.form.controls.quantity;
    const value = control.value;
    if (value == null || Number.isNaN(value) || value < 1) {
      control.setValue(1);
    }
  }

  protected bedCount(type: string): number {
    return this.bedCounts()[type] ?? 0;
  }

  protected adjustBedCount(type: string, delta: number): void {
    this.bedCounts.update((current) => ({
      ...current,
      [type]: Math.max(0, (current[type] ?? 0) + delta),
    }));
    this.syncBedConfiguration();
  }

  protected adjustBedrooms(delta: number): void {
    this.bedroomCount.update((value) => Math.max(0, value + delta));
    this.syncBedConfiguration();
  }

  protected bedPreview(): string {
    return this.form.controls.bedConfiguration.value;
  }

  private applyBedConfiguration(value: string): void {
    const counts: Record<string, number> = {
      King: 0,
      Queen: 0,
      Double: 0,
      Twin: 0,
      Single: 0,
      'Sofa bed': 0,
    };
    let bedrooms = 0;

    const [bedsPart, roomsPart] = value.split('•').map((part) => part.trim());
    const roomsSource = roomsPart || (/bedroom/i.test(bedsPart ?? '') ? bedsPart : '');
    const roomsMatch = roomsSource?.match(/(\d+)\s*bedrooms?/i);
    if (roomsMatch) bedrooms = Number(roomsMatch[1]);

    const bedsSource = roomsPart ? bedsPart : /bedroom/i.test(bedsPart ?? '') ? '' : bedsPart;
    if (bedsSource) {
      for (const match of bedsSource.matchAll(/(\d+)\s+([^,]+)/g)) {
        const label = match[2].trim();
        const known = this.bedTypes.find((type) => type.toLowerCase() === label.toLowerCase());
        if (known) counts[known] = Number(match[1]);
      }
    }

    this.bedCounts.set(counts);
    this.bedroomCount.set(bedrooms);
    this.syncBedConfiguration();
  }

  private syncBedConfiguration(): void {
    this.form.controls.bedConfiguration.setValue(composeBedConfiguration(this.bedCounts(), this.bedroomCount()));
  }

  protected addCustomAmenity(): void {
    const name = this.form.controls.extraAmenityName.value.trim();
    if (!name) return;

    const predefined = findPredefinedAmenity('', name);
    if (predefined) {
      this.selectedAmenityKeys.update((current) => new Set(current).add(predefined.key));
      this.form.controls.extraAmenityName.setValue('');
      return;
    }

    this.customAmenities.update((list) => {
      if (list.some((item) => item.name.toLowerCase() === name.toLowerCase())) return list;
      return [...list, { name, icon: this.customAmenityIcon() }];
    });
    this.form.controls.extraAmenityName.setValue('');
  }

  protected removeCustomAmenity(name: string): void {
    this.customAmenities.update((list) => list.filter((item) => item.name !== name));
  }

  private applyAmenitiesFromRoom(amenities: RoomAmenity[]): void {
    const selected = new Set<string>();
    const others: { name: string; icon: string }[] = [];

    for (const amenity of amenities) {
      const predefined = findPredefinedAmenity(amenity.key, amenity.name);
      if (predefined) {
        selected.add(predefined.key);
      } else if (amenity.name.trim()) {
        others.push({
          name: amenity.name.trim(),
          icon: amenity.icon?.trim() || 'star',
        });
      }
    }

    this.selectedAmenityKeys.set(selected);
    this.customAmenities.set(others);
  }

  private buildAmenitiesPayload(): RoomAmenity[] {
    const predefined = PREDEFINED_ROOM_AMENITIES.filter((amenity) =>
      this.selectedAmenityKeys().has(amenity.key),
    ).map((amenity) => toAmenityPayload(amenity));

    const custom = this.customAmenities().map((amenity) => ({
      key: slugify(amenity.name),
      name: amenity.name,
      icon: amenity.icon,
      iconType: 'material',
    }));

    return [...predefined, ...custom];
  }

  private syncPriceSymbol(code: string): void {
    this.priceSymbol.set(currencyDisplaySymbol(code));
  }

  save(): void {
    if (this.form.invalid || this.uploading()) return;

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const title = raw.title.trim();
    const amenities = this.buildAmenitiesPayload();
    const weekdayPrice = Number(raw.wdPrice) || 0;
    const weekendPrice = Number(raw.wePrice) || 0;
    const basePrice = weekdayPrice;

    const base: RoomCreatePayload | RoomUpdatePayload = {
      title,
      type: raw.type.trim(),
      description: raw.description,
      price: basePrice,
      wdPrice: weekdayPrice,
      wePrice: weekendPrice,
      currency: normalizeCurrencyCode(raw.currency),
      guests: raw.guests,
      quantity: raw.quantity ?? 1,
      size: raw.size ?? 1,
      unit: raw.unit.trim() || 'sq ft',
      bedConfiguration: raw.bedConfiguration.trim(),
      amenities,
      images: this.images(),
      isActive: raw.isActive,
    };

    if (!this.isEdit) {
      base.slug = slugify(title);
    }

    const request = this.isEdit
      ? this.roomApi.update(this.roomIdOrSlug, base)
      : this.roomApi.create(base as RoomCreatePayload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/rooms']);
      },
      error: () => {
        this.saving.set(false);
        this.error.set(this.roomApi.error() ?? 'Failed to save room.');
      },
    });
  }
}

function composeBedConfiguration(counts: Record<string, number>, bedrooms: number): string {
  const beds = ['King', 'Queen', 'Double', 'Twin', 'Single', 'Sofa bed']
    .filter((type) => (counts[type] ?? 0) > 0)
    .map((type) => `${counts[type]} ${type}`)
    .join(', ');
  const rooms = bedrooms > 0 ? `${bedrooms} bedroom${bedrooms === 1 ? '' : 's'}` : '';
  if (beds && rooms) return `${beds} • ${rooms}`;
  return beds || rooms;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeUnit(unit?: string): string {
  const value = (unit ?? '').trim().toLowerCase().replace(/\./g, '');
  if (value === 'sqm' || value === 'sq m' || value === 'square meter' || value === 'square meters') {
    return 'sq m';
  }

  return 'sq ft';
}

