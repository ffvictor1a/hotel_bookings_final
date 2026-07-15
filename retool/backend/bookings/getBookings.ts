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
  billing_type: "receipt" | "invoice" | null
  receipt_vat: string | null
  receipt_tax_office: string | null
  company_name: string | null
  vat: string | null
  tax_office: string | null
  company_phone: string | null
  company_address: string | null
  company_email: string | null
  company_activity: string | null
}

export default async function (_req: { params: Record<string, never>; user: User }) {
  const result = await retoolDb.query<Booking>(
    `SELECT b.id, b.full_name, b.hotel, b.room_type, b.checkin, b.checkout,
            b.status, b.email, b.mobile, b.guests, b.created_at,
            b.amount, b.companion,
            b.billing_type, b.receipt_vat, b.receipt_tax_office,
            b.company_name, b.vat, b.tax_office,
            b.company_phone, b.company_address, b.company_email, b.company_activity
     FROM "bookingsData" b
     ORDER BY b.id`
  )
  return result.data
}
