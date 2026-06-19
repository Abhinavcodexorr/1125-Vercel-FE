import { normalizeCurrencyCode } from '../constants/currencies';

export interface BookingGuest {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber?: string;
}

export interface BookingSnapshot {
  categoryName: string;
  roomTitle: string;
  pricePerNight: number;
}

export interface BookingPayment {
  method: string;
  amount: number;
  status: string;
  type?: string;
  transactionId?: string;
  paymentDate?: string;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'checked_in'
  | 'checked_out';

export interface Booking {
  id: string;
  bookingReference?: string;
  bookingType?: string;
  stayName?: string;
  categoryId: string;
  roomId: string;
  guest: BookingGuest;
  snapshot: BookingSnapshot;
  checkIn: string;
  checkOut: string;
  nights?: number;
  adults?: number;
  children?: number;
  numGuests: number;
  grandTotal: number;
  currency?: string;
  payment: BookingPayment;
  status: BookingStatus;
  createdAt: string;
}

export interface BookingDashboardStats {
  totalBookings: number;
  totalPayment: number;
  cancelledBookings: number;
  totalCabins: number;
  activeCabins: number;
  cabinOnlyRevenueTillDate?: number;
  activityOnlyRevenueTillDate?: number;
  cabinBookings?: number;
  cabinCancelledBookings?: number;
  activityBookings?: number;
  activityCancelledBookings?: number;
}

export interface PaymentBreakdownItem {
  id: string;
  count: number;
  totalAmount: number;
}

export interface BookingStatistics {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  checkedInBookings: number;
  checkedOutBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  paymentBreakdown: PaymentBreakdownItem[];
}

/** GET /booking/calendar item */
export interface ApiBookingCalendarItem {
  id: string;
  bookingReference?: string;
  title?: string;
  start: string;
  end: string;
  cabin?: {
    id?: string;
    name?: string;
    cabinType?: string;
  };
  guest?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    mobileNumber?: string;
  };
  adults?: number;
  children?: number;
  totalAmount?: number;
  currency?: string;
  paymentStatus?: string;
  status?: string;
  createdAt?: string;
}

export interface BookingCalendarEntry {
  id: string;
  bookingReference?: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  roomTitle: string;
  guestName: string;
  guestEmail?: string;
  guestMobile?: string;
  adults?: number;
  children?: number;
  cabinType?: string;
  title?: string;
  paymentStatus?: string;
  totalAmount?: number;
  currency?: string;
}

export function isPaidCalendarBooking(entry: BookingCalendarEntry): boolean {
  return (entry.paymentStatus ?? '').trim().toLowerCase() === 'paid';
}

export function mapBookingCalendarEntry(doc: ApiBookingCalendarItem): BookingCalendarEntry {
  const guestName = `${doc.guest?.firstName ?? ''} ${doc.guest?.lastName ?? ''}`.trim();
  const titleParts = doc.title?.split(' - ') ?? [];
  const roomTitle = doc.cabin?.name ?? titleParts[0]?.trim() ?? doc.title ?? 'Booking';

  return {
    id: doc.id,
    bookingReference: doc.bookingReference,
    checkIn: doc.start,
    checkOut: doc.end,
    status: normalizeBookingStatus(doc.status),
    roomTitle,
    guestName: guestName || titleParts.slice(1).join(' - ').trim() || 'Guest',
    guestEmail: doc.guest?.email,
    guestMobile: doc.guest?.mobileNumber,
    adults: doc.adults,
    children: doc.children,
    cabinType: doc.cabin?.cabinType,
    title: doc.title,
    paymentStatus: doc.paymentStatus,
    totalAmount: doc.totalAmount,
    currency: normalizeCurrencyCode(doc.currency),
  };
}

export interface BookingStatusPayload {
  status: BookingStatus;
}

/** GET /booking?filter= */
export type BookingListFilter = 'incomplete' | 'paid' | 'cancelled';

export type BookingSection = 'incomplete' | 'complete' | 'cancelled';

export function sectionToBookingFilter(section: BookingSection): BookingListFilter {
  switch (section) {
    case 'complete':
      return 'paid';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'incomplete';
  }
}

export interface ApiBookingRoom {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  slug?: string;
  type?: string;
  quantity?: number;
}

export interface ApiBookingGuest {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  mobileNumber?: string;
  name?: string;
}

export interface ApiBookingAmounts {
  subTotal?: number;
  discount?: number;
  total?: number;
  currency?: string;
}

export interface ApiBookingDocument {
  _id?: string;
  id?: string;
  bookingReference?: string;
  reference?: string;
  bookingType?: string;
  stayName?: string;
  status?: string;
  categoryId?: string;
  roomId?: string;
  room?: ApiBookingRoom;
  roomTitle?: string;
  roomType?: string;
  categoryName?: string;
  type?: string;
  guest?: ApiBookingGuest;
  guestInfo?: ApiBookingGuest;
  customer?: ApiBookingGuest;
  checkInDate?: string;
  checkIn?: string;
  checkOutDate?: string;
  checkOut?: string;
  nights?: number;
  adults?: number;
  children?: number;
  numberOfGuests?: number;
  numGuests?: number;
  guests?: number;
  amounts?: ApiBookingAmounts;
  totalAmount?: number;
  grandTotal?: number;
  totalPrice?: number;
  pricePerNight?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  paymentType?: string;
  paymentDate?: string;
  transactionId?: string;
  payment?: {
    method?: string;
    status?: string;
    amount?: number;
    type?: string;
    transactionId?: string;
    paymentDate?: string;
  };
  currency?: string;
  createdAt?: string;
}

export function normalizeBookingStatus(status?: string): BookingStatus {
  const value = (status ?? 'pending').trim().toLowerCase().replace(/-/g, '_');
  switch (value) {
    case 'confirmed':
    case 'cancelled':
    case 'completed':
    case 'pending':
    case 'checked_in':
    case 'checked_out':
      return value;
    default:
      return 'pending';
  }
}

function parseGuest(doc: ApiBookingDocument): BookingGuest {
  const guestSource = doc.guest ?? doc.guestInfo ?? doc.customer;
  const fullName = guestSource?.fullName?.trim() ?? guestSource?.name?.trim() ?? '';
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = guestSource?.firstName ?? nameParts[0] ?? 'Guest';
  const lastName = guestSource?.lastName ?? nameParts.slice(1).join(' ') ?? '';

  return {
    firstName,
    lastName,
    email: guestSource?.email ?? '',
    mobileNumber: guestSource?.mobileNumber,
  };
}

export function mapApiBooking(doc: ApiBookingDocument): Booking {
  const guest = parseGuest(doc);
  const room = doc.room;
  const roomTitle = doc.stayName ?? room?.name ?? room?.title ?? doc.roomTitle ?? 'Room';
  const categoryName = room?.type ?? doc.roomType ?? doc.categoryName ?? doc.bookingType ?? '—';
  const amounts = doc.amounts;
  const paymentStatus = (doc.payment?.status ?? doc.paymentStatus ?? 'pending')
    .trim()
    .toLowerCase();
  const paymentMethod = (doc.payment?.method ?? doc.paymentMethod ?? doc.paymentType ?? '—').trim();
  const paymentType = (doc.payment?.type ?? doc.paymentType ?? doc.paymentMethod ?? '').trim();
  const amount =
    amounts?.total ??
    doc.grandTotal ??
    doc.totalAmount ??
    doc.totalPrice ??
    doc.payment?.amount ??
    0;
  const currency = normalizeCurrencyCode(amounts?.currency ?? doc.currency);
  const adults = doc.adults ?? 0;
  const children = doc.children ?? 0;
  const numGuests =
    adults + children > 0
      ? adults + children
      : (doc.numberOfGuests ?? doc.numGuests ?? doc.guests ?? 1);

  return {
    id: doc.id ?? doc._id ?? doc.bookingReference ?? doc.reference ?? '',
    bookingReference: doc.bookingReference ?? doc.reference,
    bookingType: doc.bookingType,
    stayName: doc.stayName ?? roomTitle,
    categoryId: doc.categoryId ?? '',
    roomId: doc.roomId ?? room?.id ?? room?._id ?? '',
    guest,
    snapshot: {
      categoryName,
      roomTitle,
      pricePerNight: doc.pricePerNight ?? 0,
    },
    checkIn: doc.checkInDate ?? doc.checkIn ?? '',
    checkOut: doc.checkOutDate ?? doc.checkOut ?? '',
    nights: doc.nights,
    adults: adults || undefined,
    children: children || undefined,
    numGuests,
    grandTotal: amount,
    currency,
    payment: {
      method: paymentMethod,
      type: paymentType || undefined,
      amount,
      status: paymentStatus,
      transactionId: doc.transactionId ?? doc.payment?.transactionId,
      paymentDate: doc.paymentDate ?? doc.payment?.paymentDate,
    },
    status: normalizeBookingStatus(doc.status),
    createdAt: doc.createdAt ?? new Date().toISOString(),
  };
}

export function mapBookingDashboardStats(data: Record<string, unknown>): BookingDashboardStats {
  return {
    totalBookings: Number(data['totalBookings'] ?? 0),
    totalPayment: Number(data['totalPayment'] ?? 0),
    cancelledBookings: Number(data['cancelledBookings'] ?? 0),
    totalCabins: Number(data['totalCabins'] ?? 0),
    activeCabins: Number(data['activeCabins'] ?? 0),
    cabinOnlyRevenueTillDate: Number(data['cabinOnlyRevenueTillDate'] ?? 0),
    activityOnlyRevenueTillDate: Number(data['activityOnlyRevenueTillDate'] ?? 0),
    cabinBookings: Number(
      data['cabinBookings'] ?? data['cabinTotalBookings'] ?? data['totalCabinBookings'] ?? 0,
    ),
    cabinCancelledBookings: Number(
      data['cabinCancelledBookings'] ?? data['cabinCancelled'] ?? data['cancelledCabinBookings'] ?? 0,
    ),
    activityBookings: Number(
      data['activityBookings'] ?? data['activityTotalBookings'] ?? data['totalActivityBookings'] ?? 0,
    ),
    activityCancelledBookings: Number(
      data['activityCancelledBookings'] ??
        data['activityCancelled'] ??
        data['cancelledActivityBookings'] ??
        0,
    ),
  };
}

function mapPaymentBreakdown(data: Record<string, unknown>): PaymentBreakdownItem[] {
  const raw = data['paymentBreakdown'];
  if (!Array.isArray(raw)) return [];

  return raw.map((item) => {
    const record = item as Record<string, unknown>;
    return {
      id: String(record['_id'] ?? record['id'] ?? ''),
      count: Number(record['count'] ?? 0),
      totalAmount: Number(record['totalAmount'] ?? 0),
    };
  });
}

export function mapBookingStatistics(data: Record<string, unknown>): BookingStatistics {
  const breakdown = (data['statusBreakdown'] as Record<string, unknown> | undefined) ?? {};
  return {
    totalBookings: Number(data['totalBookings'] ?? breakdown['totalBookings'] ?? 0),
    pendingBookings: Number(breakdown['pendingBookings'] ?? 0),
    confirmedBookings: Number(breakdown['confirmedBookings'] ?? 0),
    checkedInBookings: Number(breakdown['checkedInBookings'] ?? 0),
    checkedOutBookings: Number(breakdown['checkedOutBookings'] ?? 0),
    cancelledBookings: Number(data['cancelledBookings'] ?? breakdown['cancelledBookings'] ?? 0),
    totalRevenue: Number(data['totalRevenue'] ?? breakdown['totalRevenue'] ?? 0),
    averageBookingValue: Number(breakdown['averageBookingValue'] ?? 0),
    paymentBreakdown: mapPaymentBreakdown(data),
  };
}
