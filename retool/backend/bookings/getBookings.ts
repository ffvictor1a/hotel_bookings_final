export type Booking = {
  id: number
  full_name: string | null
  hotel: string | null
  room_type: string | null
  checkin: string | null
  checkout: string | null
  price_per_night: number | null
  status: "paid" | "pending" | "cancelled" | "confirmed"
  email: string | null
  mobile: string | null
  guests: number | null
  created_at: string
}

export default async function (_req: { params: Record<string, never>; user: User }) {
  const result = await retoolDb.query<Booking>(
    `SELECT b.id, b.full_name, b.hotel, b.room_type, b.checkin, b.checkout,
            b.status, b.email, b.mobile, b.guests, b.created_at,
            a.price_per_night
     FROM "bookingsData" b
     LEFT JOIN allotments a
       ON b.hotel = a.hotel AND b.room_type = a.room_type
     ORDER BY b.id`
  )
  return result.data
}
