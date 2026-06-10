import { Injectable, computed, signal } from '@angular/core';
import { Booking } from '../models/booking.model';
import { Category, CategoryForm } from '../models/category.model';
import { GalleryForm, GalleryImage, GallerySection } from '../models/gallery.model';

const STORAGE_KEY = 'beach-villa-admin-data';

interface LegacyRoomAmenity {
  name: string;
  iconKey: string;
}

interface LegacyRoom {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  maxGuests: number;
  sizeSqft: number;
  bedrooms: number;
  bathrooms: number;
  basePricePerNight: number;
  amenities: LegacyRoomAmenity[];
  isActive: boolean;
  isDeleted: boolean;
  isFeatured: boolean;
  createdAt: string;
}

type LegacyRoomForm = Omit<LegacyRoom, 'id' | 'createdAt' | 'isDeleted'>;

interface StoreData {
  categories: Category[];
  rooms: LegacyRoom[];
  gallery: GalleryImage[];
  bookings: Booking[];
}

function uid(): string {
  return crypto.randomUUID();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function seedData(): StoreData {
  const catDeluxe = uid();
  const catStandard = uid();
  const catChalet = uid();
  const roomDeluxe = uid();
  const roomStandard = uid();
  const roomChalet = uid();

  const categories: Category[] = [
    {
      id: catDeluxe,
      name: '5 Bedroom Deluxe',
      slug: '5-bedroom-deluxe',
      description: 'Luxury multi-bedroom villas with full amenities.',
      isActive: true,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: catStandard,
      name: 'Standard Room',
      slug: 'standard-room',
      description: 'Comfortable rooms ideal for couples.',
      isActive: true,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: catChalet,
      name: 'Chalets',
      slug: 'chalets',
      description: 'Private beach chalets with deck access.',
      isActive: true,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    },
  ];

  const rooms: LegacyRoom[] = [
    {
      id: roomDeluxe,
      categoryId: catDeluxe,
      title: '5 Bedroom Deluxe Villa',
      slug: '5-bedroom-deluxe-villa',
      description: 'Spacious beachfront villa with five en-suite bedrooms and private pergola.',
      maxGuests: 10,
      sizeSqft: 4500,
      bedrooms: 5,
      bathrooms: 5,
      basePricePerNight: 85000,
      amenities: [
        { name: 'Wi-Fi', iconKey: 'wifi' },
        { name: 'Pool Access', iconKey: 'pool' },
        { name: 'Beach Access', iconKey: 'beach' },
      ],
      isActive: true,
      isDeleted: false,
      isFeatured: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: roomStandard,
      categoryId: catStandard,
      title: 'Standard Room 101',
      slug: 'standard-room-101',
      description: 'Cozy room steps from the beach.',
      maxGuests: 2,
      sizeSqft: 320,
      bedrooms: 1,
      bathrooms: 1,
      basePricePerNight: 18000,
      amenities: [
        { name: 'Wi-Fi', iconKey: 'wifi' },
        { name: 'Air Conditioning', iconKey: 'ac' },
      ],
      isActive: true,
      isDeleted: false,
      isFeatured: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: roomChalet,
      categoryId: catChalet,
      title: 'Beach Chalet A',
      slug: 'beach-chalet-a',
      description: 'Private chalet with ocean view deck.',
      maxGuests: 4,
      sizeSqft: 680,
      bedrooms: 2,
      bathrooms: 2,
      basePricePerNight: 42000,
      amenities: [
        { name: 'Wi-Fi', iconKey: 'wifi' },
        { name: 'Deck Access', iconKey: 'deck' },
        { name: 'Ocean View', iconKey: 'view' },
      ],
      isActive: true,
      isDeleted: false,
      isFeatured: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const gallery: GalleryImage[] = [
    {
      id: uid(),
      categoryId: catChalet,
      section: 'outdoor',
      url: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800',
      caption: 'Pergola at sunset',
      sortOrder: 0,
      isActive: true,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      categoryId: catChalet,
      section: 'pool_beach',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      caption: 'Private beach access',
      sortOrder: 1,
      isActive: true,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      categoryId: catDeluxe,
      section: 'interior',
      url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800',
      caption: 'Deluxe living area',
      sortOrder: 0,
      isActive: true,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    },
  ];

  const bookings: Booking[] = [
    {
      id: uid(),
      categoryId: catChalet,
      roomId: roomChalet,
      guest: { firstName: 'Rahul', lastName: 'Sharma', email: 'rahul@example.com' },
      snapshot: { categoryName: 'Chalets', roomTitle: 'Beach Chalet A', pricePerNight: 42000 },
      checkIn: '2026-06-01',
      checkOut: '2026-06-05',
      numGuests: 3,
      grandTotal: 168500,
      payment: { method: 'upi', amount: 168500, status: 'captured' },
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      categoryId: catDeluxe,
      roomId: roomDeluxe,
      guest: { firstName: 'Priya', lastName: 'Mehta', email: 'priya@example.com' },
      snapshot: { categoryName: 'Deluxe', roomTitle: 'Deluxe Sea View', pricePerNight: 28000 },
      checkIn: '2026-07-10',
      checkOut: '2026-07-12',
      numGuests: 2,
      grandTotal: 56000,
      payment: { method: 'card', amount: 56000, status: 'pending' },
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      categoryId: catStandard,
      roomId: roomStandard,
      guest: { firstName: 'Arjun', lastName: 'Patel', email: 'arjun@example.com' },
      snapshot: { categoryName: 'Standard Room', roomTitle: 'Standard Garden', pricePerNight: 12000 },
      checkIn: '2026-05-01',
      checkOut: '2026-05-04',
      numGuests: 2,
      grandTotal: 36000,
      payment: { method: 'bank_transfer', amount: 36000, status: 'captured' },
      status: 'completed',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      categoryId: catChalet,
      roomId: roomChalet,
      guest: { firstName: 'Neha', lastName: 'Kapoor', email: 'neha@example.com' },
      snapshot: { categoryName: 'Chalets', roomTitle: 'Beach Chalet A', pricePerNight: 42000 },
      checkIn: '2026-08-15',
      checkOut: '2026-08-18',
      numGuests: 4,
      grandTotal: 126000,
      payment: { method: 'upi', amount: 126000, status: 'failed' },
      status: 'cancelled',
      createdAt: new Date().toISOString(),
    },
  ];

  return { categories, rooms, gallery, bookings };
}

function migrateStore(data: StoreData): StoreData {
  return {
    categories: data.categories.map((c) => ({
      ...c,
      isActive: c.isActive ?? true,
      isDeleted: c.isDeleted ?? false,
    })),
    rooms: data.rooms.map((r) => {
      const legacy = r as LegacyRoom & { status?: string };
      const fromLegacy = legacy.status !== undefined ? legacy.status === 'active' : undefined;
      return {
        ...r,
        isActive: r.isActive ?? fromLegacy ?? true,
        isDeleted: r.isDeleted ?? false,
      };
    }),
    gallery: data.gallery.map((g) => ({
      ...g,
      isActive: g.isActive ?? true,
      isDeleted: g.isDeleted ?? false,
    })),
    bookings: data.bookings,
  };
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly categories = signal<Category[]>([]);
  private readonly rooms = signal<LegacyRoom[]>([]);
  private readonly gallery = signal<GalleryImage[]>([]);
  private readonly bookings = signal<Booking[]>([]);

  readonly allCategories = this.categories.asReadonly();
  readonly allRooms = this.rooms.asReadonly();
  readonly allGallery = this.gallery.asReadonly();
  readonly bookingsList = this.bookings.asReadonly();

  readonly activeCategories = computed(() =>
    this.categories().filter((c) => c.isActive && !c.isDeleted),
  );

  readonly stats = computed(() => ({
    categories: this.categories().filter((c) => c.isActive && !c.isDeleted).length,
    rooms: this.rooms().filter((r) => r.isActive && !r.isDeleted).length,
    gallery: this.gallery().filter((g) => g.isActive && !g.isDeleted).length,
    bookings: this.bookings().length,
    revenue: this.bookings()
      .filter((b) => b.payment.status === 'captured')
      .reduce((sum, b) => sum + b.grandTotal, 0),
  }));

  constructor() {
    this.load();
  }

  filterCategories(list: Category[], showDeleted: boolean): Category[] {
    return showDeleted ? list : list.filter((c) => !c.isDeleted);
  }

  filterRooms(list: LegacyRoom[], showDeleted: boolean): LegacyRoom[] {
    return showDeleted ? list : list.filter((r) => !r.isDeleted);
  }

  filterGallery(list: GalleryImage[], showDeleted: boolean): GalleryImage[] {
    return showDeleted ? list : list.filter((g) => !g.isDeleted);
  }

  getCategoryById(id: string): Category | undefined {
    return this.categories().find((c) => c.id === id);
  }

  getRoomsByCategory(categoryId: string, showDeleted = false): LegacyRoom[] {
    return this.filterRooms(
      this.rooms().filter((r) => r.categoryId === categoryId),
      showDeleted,
    );
  }

  getGalleryByCategory(categoryId: string, showDeleted = false): GalleryImage[] {
    return this.filterGallery(
      this.gallery()
        .filter((g) => g.categoryId === categoryId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
      showDeleted,
    );
  }

  addCategory(form: CategoryForm): Category {
    const category: Category = {
      id: uid(),
      ...form,
      slug: form.slug || slugify(form.name),
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };
    this.categories.update((list) => [...list, category]);
    this.persist();
    return category;
  }

  updateCategory(id: string, form: CategoryForm): void {
    this.categories.update((list) =>
      list.map((c) =>
        c.id === id ? { ...c, ...form, slug: form.slug || slugify(form.name) } : c,
      ),
    );
    this.persist();
  }

  softDeleteCategory(id: string): void {
    this.categories.update((list) =>
      list.map((c) => (c.id === id ? { ...c, isDeleted: true, isActive: false } : c)),
    );
    this.rooms.update((list) =>
      list.map((r) => (r.categoryId === id ? { ...r, isDeleted: true, isActive: false } : r)),
    );
    this.gallery.update((list) =>
      list.map((g) => (g.categoryId === id ? { ...g, isDeleted: true, isActive: false } : g)),
    );
    this.persist();
  }

  restoreCategory(id: string): void {
    this.categories.update((list) =>
      list.map((c) => (c.id === id ? { ...c, isDeleted: false, isActive: true } : c)),
    );
    this.persist();
  }

  addRoom(form: LegacyRoomForm): LegacyRoom {
    const room: LegacyRoom = {
      id: uid(),
      ...form,
      slug: form.slug || slugify(form.title),
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };
    this.rooms.update((list) => [...list, room]);
    this.persist();
    return room;
  }

  updateRoom(id: string, form: LegacyRoomForm): void {
    this.rooms.update((list) =>
      list.map((r) =>
        r.id === id ? { ...r, ...form, slug: form.slug || slugify(form.title) } : r,
      ),
    );
    this.persist();
  }

  softDeleteRoom(id: string): void {
    this.rooms.update((list) =>
      list.map((r) => (r.id === id ? { ...r, isDeleted: true, isActive: false } : r)),
    );
    this.persist();
  }

  restoreRoom(id: string): void {
    this.rooms.update((list) =>
      list.map((r) => (r.id === id ? { ...r, isDeleted: false, isActive: true } : r)),
    );
    this.persist();
  }

  addGalleryImage(form: GalleryForm): GalleryImage {
    const existing = this.getGalleryByCategory(form.categoryId, true);
    const image: GalleryImage = {
      id: uid(),
      ...form,
      sortOrder: existing.length,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };
    this.gallery.update((list) => [...list, image]);
    this.persist();
    return image;
  }

  updateGalleryImage(id: string, form: GalleryForm): void {
    this.gallery.update((list) => list.map((g) => (g.id === id ? { ...g, ...form } : g)));
    this.persist();
  }

  softDeleteGalleryImage(id: string): void {
    this.gallery.update((list) =>
      list.map((g) => (g.id === id ? { ...g, isDeleted: true, isActive: false } : g)),
    );
    this.persist();
  }

  restoreGalleryImage(id: string): void {
    this.gallery.update((list) =>
      list.map((g) => (g.id === id ? { ...g, isDeleted: false, isActive: true } : g)),
    );
    this.persist();
  }

  private load(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const data = migrateStore(JSON.parse(raw) as StoreData);
        this.categories.set(data.categories);
        this.rooms.set(data.rooms);
        this.gallery.set(data.gallery);
        this.bookings.set(data.bookings);
        this.persist();
        return;
      } catch {
        /* fall through to seed */
      }
    }
    const seed = seedData();
    this.categories.set(seed.categories);
    this.rooms.set(seed.rooms);
    this.gallery.set(seed.gallery);
    this.bookings.set(seed.bookings);
    this.persist();
  }

  private persist(): void {
    const data: StoreData = {
      categories: this.categories(),
      rooms: this.rooms(),
      gallery: this.gallery(),
      bookings: this.bookings(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}
