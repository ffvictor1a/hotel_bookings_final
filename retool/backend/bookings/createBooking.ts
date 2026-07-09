type RoomEntry = {
  hotel: string
  room_type: string
  guests: number
  amount: number
}

type Params = {
  full_name: string
  email: string
  mobile: string
  checkin: string
  checkout: string
  companion: string
  status: string
  notes: string
  group_name: string
  rooms: RoomEntry[]
}

export default async function (req: { params: Params; user: User }) {
  const {
    full_name, email, mobile, checkin, checkout,
    companion, status, notes, group_name, rooms,
  } = req.params

  const inserted: Array<{ id: number }> = []

  for (const room of rooms) {
    const result = await retoolDb.query<{ id: number }>(
      `INSERT INTO "bookingsData"
         (full_name, email, mobile, checkin, checkout, hotel, room_type,
          guests, companion, status, notes, group_name, amount, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'admin', NOW())
       RETURNING id`,
      [
        full_name,
        email || null,
        mobile || null,
        checkin,
        checkout,
        room.hotel,
        room.room_type,
        room.guests,
        companion || null,
        status,
        notes || null,
        group_name || null,
        room.amount ?? 0,
      ]
    )
    if (result.data[0]) inserted.push(result.data[0])
  }

  return { success: true, count: inserted.length, ids: inserted.map((r) => r.id) }
}
