export type PaymentRow = {
  full_name: string | null
  hotel: string | null
  room_type: string | null
  amount: number | null
  status: string | null
  created_at: string | null
}

export default async function (_req: { params: Record<string, never>; user: User }) {
  const result = await retoolDb.query<PaymentRow>(
    `SELECT full_name, hotel, room_type, amount, status, created_at
     FROM "bookingsData"
     ORDER BY created_at DESC`
  )
  return result.data
}
