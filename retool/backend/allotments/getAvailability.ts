type AvailabilityRow = {
  hotel: string
  room_type: string
  total_allotment: number
  booked_count: number
  available: number
}

type RawRow = {
  hotel: string
  room_type: string
  total_allotment: number
  booked_count: string | number
  available: string | number
}

export default async function (_req: { params: Record<string, never>; user: User }) {
  const result = await retoolDb.query<RawRow>(`
    SELECT 
      a.hotel, 
      a.room_type, 
      a.total_allotment,
      COUNT(b.id) FILTER (WHERE b.status IN ('paid','confirmed')) AS booked_count,
      a.total_allotment - COUNT(b.id) FILTER (WHERE b.status IN ('paid','confirmed')) AS available
    FROM allotments a
    LEFT JOIN "bookingsData" b ON b.hotel = a.hotel AND b.room_type = a.room_type
    GROUP BY a.hotel, a.room_type, a.total_allotment
    ORDER BY a.hotel, a.room_type
  `)

  return result.data.map((row): AvailabilityRow => ({
    hotel: row.hotel,
    room_type: row.room_type,
    total_allotment: Number(row.total_allotment),
    booked_count: Number(row.booked_count),
    available: Number(row.available),
  }))
}
