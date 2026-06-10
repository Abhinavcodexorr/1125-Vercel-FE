export interface BookingGuest {
  firstName: string;
  lastName: string;
  email: string;
}

export interface BookingSnapshot {
  categoryName: string;
  roomTitle: string;
  pricePerNight: number;
}

export interface BookingPayment {
  method: 'card' | 'upi' | 'bank_transfer';
  amount: number;
  status: 'pending' | 'captured' | 'failed';
}

export interface Booking {
  id: string;
  categoryId: string;
  roomId: string;
  guest: BookingGuest;
  snapshot: BookingSnapshot;
  checkIn: string;
  checkOut: string;
  numGuests: number;
  grandTotal: number;
  payment: BookingPayment;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
}
