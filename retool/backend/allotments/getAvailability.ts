type AvailabilityRow = {
  hotel: string
  room_type: string
  total_allotment: number
  booked_count: number
  available: number
  stars: number | null
  breakfast_included: boolean | null
  breakfast_extra_price: number | null
}

type RawRow = {
  hotel: string
  room_type: string
  total_allotment: number
  booked_count: string | number
  available: string | number
  stars: number | null
  breakfast_included: boolean | null
  breakfast_extra_price: number | null
}

export default async function (_req: { params: Record<string, never>; user: User }) {
  const result = await retoolDb.query<RawRow>(`
    SELECT 
      a.hotel, 
      a.room_type, 
      a.total_allotment,
      a.stars,
      a.breakfast_included,
      a.breakfast_extra_price,
      COUNT(b.id) FILTER (WHERE b.status IN ('paid','confirmed')) AS booked_count,
      a.total_allotment - COUNT(b.id) FILTER (WHERE b.status IN ('paid','confirmed')) AS available
    FROM allotments a
    LEFT JOIN "bookingsData" b ON b.hotel = a.hotel AND b.room_type = a.room_type
    GROUP BY a.hotel, a.room_type, a.total_allotment, a.stars, a.breakfast_included, a.breakfast_extra_price
    ORDER BY a.hotel, a.room_type
  `)

  return result.data.map((row): AvailabilityRow => ({
    hotel: row.hotel,
    room_type: row.room_type,
    total_allotment: Number(row.total_allotment),
    booked_count: Number(row.booked_count),
    available: Number(row.available),
    stars: row.stars != null ? Number(row.stars) : null,
    breakfast_included: row.breakfast_included ?? null,
    breakfast_extra_price: row.breakfast_extra_price != null ? Number(row.breakfast_extra_price) : null,
  }))
}
