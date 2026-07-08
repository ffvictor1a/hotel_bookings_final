type Params = {
  hotel: string
}

export type RoomingRow = {
  full_name: string | null
  room_type: string | null
  checkin: string | null
  checkout: string | null
  guests: number | null
  companion: string | null
  special_needs: string | null
}

export default async function (req: { params: Params; user: User }) {
  const result = await retoolDb.query<RoomingRow>(
    `SELECT full_name, room_type, checkin, checkout, guests, companion, special_needs
     FROM "bookingsData"
     WHERE hotel = $1
       AND status IN ('paid', 'confirmed')
     ORDER BY checkin, full_name`,
    [req.params.hotel]
  )
  return result.data
}
