import { normalizeCurrencyCode } from '../constants/currencies';

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
  /** Weekday nightly rate; falls back to price when unset on older rooms */
  wdPrice: number;
  /** Weekend nightly rate; falls back to price when unset on older rooms */
  wePrice: number;
  currency: string;
  guests: number;
  quantity: number;
  size: number;
  unit: string;
  bedConfiguration: string;
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
  wdPrice?: number;
  wePrice?: number;
  weekdayPrice?: number;
  weekendPrice?: number;
  currency: string;
  guests: number;
  quantity?: number;
  size: number;
  unit?: string;
  bedConfiguration?: string;
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
  wdPrice?: number;
  wePrice?: number;
  weekdayPrice?: number;
  weekendPrice?: number;
  currency?: string;
  guests?: number;
  quantity?: number;
  size?: number;
  unit?: string;
  bedConfiguration?: string;
  amenities?: RoomAmenity[];
  images?: RoomImage[];
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function resolveRoomPrices(doc: ApiRoomDocument): {
  price: number;
  wdPrice: number;
  wePrice: number;
} {
  const price = doc.price ?? 0;
  const wdPrice = doc.wdPrice ?? doc.weekdayPrice ?? price;
  const wePrice = doc.wePrice ?? doc.weekendPrice ?? price;
  return { price, wdPrice, wePrice };
}

export function mapApiRoom(doc: ApiRoomDocument): AdminRoom {
  const id = doc.id ?? doc._id ?? '';
  const { price, wdPrice, wePrice } = resolveRoomPrices(doc);
  return {
    id,
    title: doc.title ?? '',
    slug: doc.slug ?? '',
    type: doc.type ?? '',
    description: doc.description ?? '',
    price,
    wdPrice,
    wePrice,
    currency: normalizeCurrencyCode(doc.currency),
    guests: doc.guests ?? 1,
    quantity: doc.quantity ?? 1,
    size: doc.size ?? 0,
    unit: doc.unit ?? 'sq ft',
    bedConfiguration: doc.bedConfiguration ?? '',
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
    if (Array.isArray(record['bookings'])) return record['bookings'] as T[];
    if (Array.isArray(record['results'])) return record['results'] as T[];
    if (Array.isArray(record['subAdmins'])) return record['subAdmins'] as T[];
    if (data && typeof data === 'object') {
      const nested = data as Record<string, unknown>;
      if (Array.isArray(nested['bookings'])) return nested['bookings'] as T[];
      if (Array.isArray(nested['subAdmins'])) return nested['subAdmins'] as T[];
    }
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
  maxQuantity?: number;
  overrideQuantity?: number | null;
  blocked: boolean;
}

export interface RoomQuantityOverride {
  _id?: string;
  date: string;
  quantity: number;
}

export interface RoomQuantityCalendar {
  room: {
    _id?: string;
    title: string;
    slug: string;
    type: string;
    quantity: number;
  };
  booked: RoomAvailabilityBooking[];
  bookedDates: string[];
  partiallyBookedDates?: string[];
  availableDates: string[];
  occupancyByDate?: Record<string, RoomDateOccupancy>;
  quantityOverrides?: RoomQuantityOverride[];
  summary?: RoomAvailabilitySummary;
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
  blocked?: RoomBlockedDate[];
  bookedDates: string[];
  bookingBookedDates?: string[];
  blockedDates?: string[];
  partiallyBookedDates?: string[];
  availableDates: string[];
  occupancyByDate?: Record<string, RoomDateOccupancy>;
  summary?: RoomAvailabilitySummary;
}

/** Partial shape returned by GET /rooms/:id/availability */
export type ApiRoomAvailabilityData = Partial<
  Omit<RoomAvailability, 'room'> & { room?: Partial<RoomAvailability['room']> }
>;

export interface RoomAvailabilityContext {
  idOrSlug: string;
  title: string;
  quantity?: number;
  type?: string;
}

export function mapRoomAvailability(
  raw: ApiRoomAvailabilityData,
  context?: RoomAvailabilityContext,
): RoomAvailability {
  const bookedDates = raw.bookedDates ?? [];
  const blockedDates = raw.blockedDates ?? [];
  const room = {
    _id: raw.room?._id,
    id: raw.room?.id ?? raw.room?._id ?? context?.idOrSlug,
    title: raw.room?.title ?? context?.title ?? '',
    slug: raw.room?.slug ?? context?.idOrSlug ?? '',
    type: raw.room?.type ?? context?.type ?? '',
    quantity: raw.room?.quantity ?? context?.quantity ?? 1,
  };

  return {
    room,
    booked: raw.booked ?? [],
    blocked: raw.blocked ?? [],
    bookedDates,
    bookingBookedDates: raw.bookingBookedDates,
    blockedDates,
    partiallyBookedDates: raw.partiallyBookedDates,
    availableDates: raw.availableDates ?? [],
    occupancyByDate: raw.occupancyByDate,
    summary: raw.summary,
  };
}

export function mergeBlockedDatesIntoAvailability(
  availability: RoomAvailability,
  blockedData: Pick<RoomBlockedDatesData, 'blocked' | 'blockedDates'> | null | undefined,
): RoomAvailability {
  if (!blockedData) return availability;
  return {
    ...availability,
    blocked: blockedData.blocked?.length ? blockedData.blocked : availability.blocked ?? [],
    blockedDates: blockedData.blockedDates?.length
      ? blockedData.blockedDates
      : availability.blockedDates ?? [],
  };
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
