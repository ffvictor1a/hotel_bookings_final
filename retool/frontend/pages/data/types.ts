export type Booking = {
  id: number
  full_name: string | null
  hotel: string | null
  room_type: string | null
  checkin: string | null
  checkout: string | null
  price_per_night: number | null
  status: "paid" | "pending" | "cancelled" | "confirmed" | "waitlisted"
  email: string | null
  mobile: string | null
  guests: number | null
  created_at: string
}

export type Allotment = {
  id: number
  hotel: string
  room_type: string
  total_allotment: number
  confirmed_bookings: number
  price_per_night: number
  deadline: string
}

export type Change = {
  id: number
  change_id: string
  booking_id: string
  guest_name: string
  hotel: string
  changed_by: string
  changed_at: string
  change_description: string
  old_value: string
  new_value: string
  amount_delta: number
  requires_payment: string
  requires_refund: string
}
