type Change = {
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

export default async function (_req: { params: Record<string, never>; user: User }) {
  const result = await retoolDb.query<Change>(
    "SELECT * FROM changes ORDER BY changed_at DESC"
  )
  return result.data
}
