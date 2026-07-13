export type Booking = {
  id: number
  full_name: string | null
  hotel: string | null
  room_type: string | null
  checkin: string | null
  checkout: string | null
  amount: number | null
  companion: string | null
  status: "paid" | "pending" | "cancelled" | "confirmed" | "waitlisted" | "hosted"
  email: string | null
  mobile: string | null
  guests: number | null
  created_at: string
}
export default async function (_req: { params: Record<string, never>; user: User }) {
  const result = await retoolDb.query<Booking>(
    `SELECT b.id, b.full_name, b.hotel, b.room_type, b.checkin, b.checkout,
            b.status, b.email, b.mobile, b.guests, b.created_at,
            b.amount, b.companion
     FROM "bookingsData" b
     ORDER BY b.id`
  )
  return result.data
}