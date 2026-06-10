export interface RoomAmenity {
  key?: string;
  name: string;
  icon: string;
  iconType: string;
}

export interface RoomImage {
  url: string;
  order: number;
}

/** Room shape returned by admin APIs */
export interface AdminRoom {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string;
  price: number;
  currency: string;
  guests: number;
  quantity: number;
  size: number;
  unit: string;
  amenities: RoomAmenity[];
  images: RoomImage[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomCreatePayload {
  title: string;
  slug?: string;
  type: string;
  description?: string;
  price: number;
  currency: string;
  guests: number;
  quantity: number;
  size: number;
  unit?: string;
  amenities?: RoomAmenity[];
  images?: RoomImage[];
  isActive?: boolean;
}

export type RoomUpdatePayload = Partial<RoomCreatePayload>;

export interface RoomStatusPayload {
  isActive: boolean;
}

/** Raw API document (Mongo-style _id or id) */
export interface ApiRoomDocument {
  _id?: string;
  id?: string;
  title?: string;
  slug?: string;
  type?: string;
  description?: string;
  price?: number;
  currency?: string;
  guests?: number;
  quantity?: number;
  size?: number;
  unit?: string;
  amenities?: RoomAmenity[];
  images?: RoomImage[];
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function mapApiRoom(doc: ApiRoomDocument): AdminRoom {
  const id = doc.id ?? doc._id ?? '';
  return {
    id,
    title: doc.title ?? '',
    slug: doc.slug ?? '',
    type: doc.type ?? '',
    description: doc.description ?? '',
    price: doc.price ?? 0,
    currency: doc.currency ?? 'USD',
    guests: doc.guests ?? 1,
    quantity: doc.quantity ?? 1,
    size: doc.size ?? 0,
    unit: doc.unit ?? 'sq ft',
    amenities: doc.amenities ?? [],
    images: doc.images ?? [],
    isActive: doc.isActive ?? true,
    isDeleted: doc.isDeleted ?? false,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function unwrapApiList<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const data = record['data'];
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === 'object') {
      const nested = data as Record<string, unknown>;
      if (Array.isArray(nested['data'])) return nested['data'] as T[];
    }
    if (Array.isArray(record['rooms'])) return record['rooms'] as T[];
    if (Array.isArray(record['results'])) return record['results'] as T[];
  }
  return [];
}

export function unwrapApiItem<T>(body: unknown): T {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    if (record['data'] && typeof record['data'] === 'object') {
      return record['data'] as T;
    }
    if (record['room'] && typeof record['room'] === 'object') {
      return record['room'] as T;
    }
  }
  return body as T;
}

export interface RoomAvailabilityBooking {
  bookingReference: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  status: string;
  paymentStatus: string;
  occupiedDates: string[];
}

export interface RoomDateOccupancy {
  bookedCount: number;
  availableUnits: number;
  quantity: number;
  blocked: boolean;
}

export interface RoomAvailabilitySummary {
  totalBookings: number;
  totalBookedDays?: number;
  totalBlockedRanges?: number;
  totalBookingDays?: number;
  totalBlockedDays?: number;
  totalUnavailableDays?: number;
  totalPartiallyBookedDays?: number;
  totalAvailableDays: number;
  quantity?: number;
}

export interface RoomAvailability {
  room: {
    _id?: string;
    id?: string;
    title: string;
    slug: string;
    type: string;
    quantity?: number;
  };
  booked: RoomAvailabilityBooking[];
  bookedDates: string[];
  partiallyBookedDates?: string[];
  availableDates: string[];
  occupancyByDate?: Record<string, RoomDateOccupancy>;
  summary: RoomAvailabilitySummary;
}

export function unwrapApiData<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export interface RoomBlockedDate {
  _id: string;
  startDate: string;
  endDate: string;
  reason?: string;
  occupiedDates?: string[];
  nights?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomBlockedDatesData {
  room: {
    _id?: string;
    id?: string;
    title: string;
    slug: string;
  };
  total?: number;
  blocked: RoomBlockedDate[];
  blockedDates: string[];
}

export interface RoomBlockDatePayload {
  startDate: string;
  endDate: string;
  reason?: string;
}

export type RoomBlockDatesPayload = RoomBlockDatePayload | { blocks: RoomBlockDatePayload[] };

export interface RoomBlockDatesMutationResult {
  room: RoomBlockedDatesData['room'];
  blocked: RoomBlockedDate[];
  blockedDates: string[];
  added?: RoomBlockedDate[];
  removed?: RoomBlockedDate;
}
