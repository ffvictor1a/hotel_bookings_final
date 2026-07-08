type Allotment = {
  id: number
  hotel: string
  room_type: string
  total_allotment: number
  confirmed_bookings: number
  price_per_night: number
  deadline: string
}

export default async function (_req: { params: Record<string, never>; user: User }) {
  const result = await retoolDb.query<Allotment>(
    "SELECT id, hotel, room_type, total_allotment, confirmed_bookings, price_per_night, deadline FROM allotments ORDER BY hotel, room_type"
  )
  return result.data
}
