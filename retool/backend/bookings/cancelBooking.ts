type Params = {
  booking_id: number
}

export default async function (req: { params: Params; user: User }) {
  const { booking_id } = req.params

  // ── 1. Fetch current booking ──────────────────────────────────────────────
  const existing = await retoolDb.query<{
    id: number
    full_name: string | null
    hotel: string | null
    status: string | null
    amount: number | null
  }>(
    `SELECT id, full_name, hotel, status, amount
     FROM "bookingsData"
     WHERE id = $1`,
    [booking_id]
  )

  const booking = existing.data[0]
  if (!booking) throw new Error(`Booking ${booking_id} not found`)
  if (booking.status === "cancelled") throw new Error("Η κράτηση είναι ήδη ακυρωμένη")

  const oldStatus = booking.status ?? "unknown"

  // ── 2. Update status to cancelled ─────────────────────────────────────────
  await retoolDb.query(
    `UPDATE "bookingsData" SET status = 'cancelled' WHERE id = $1`,
    [booking_id]
  )

  // ── 3. Audit trail → INSERT INTO changes ──────────────────────────────────
  await retoolDb.query(
    `INSERT INTO "changes"
       (change_id, booking_id, guest_name, hotel,
        changed_by, changed_at, change_description,
        old_value, new_value, amount_delta,
        requires_payment, requires_refund)
     VALUES
       ($1, $2, $3, $4,
        $5, NOW(), $6,
        $7, 'cancelled', $8,
        'no', 'yes')`,
    [
      `CANCEL-${booking_id}-${Date.now()}`,
      String(booking_id),
      booking.full_name ?? "—",
      booking.hotel ?? "—",
      req.user.email,
      `Ακύρωση κράτησης (${oldStatus} → cancelled)`,
      oldStatus,
      -(booking.amount ?? 0),
    ]
  )

  return { success: true, booking_id }
}
