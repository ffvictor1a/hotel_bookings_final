export type ChangeReportRow = {
  booking_id: number | null
  guest_name: string | null
  hotel: string | null
  changed_by: string | null
  changed_at: string | null
  change_description: string | null
  old_value: string | null
  new_value: string | null
  amount_delta: number | null
}

export default async function (_req: { params: Record<string, never>; user: User }) {
  const result = await retoolDb.query<ChangeReportRow>(
    `SELECT booking_id, guest_name, hotel, changed_by, changed_at,
            change_description, old_value, new_value, amount_delta
     FROM "paymentStatus"
     ORDER BY changed_at DESC`
  )
  return result.data
}
