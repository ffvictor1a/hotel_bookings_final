type Params = {
  booking_id: number
  room_type: string
  checkin: string
  checkout: string
  companion: string
}

type BookingRow = {
  id: number
  full_name: string | null
  hotel: string | null
  room_type: string | null
  checkin: string | null
  checkout: string | null
  amount: number | null
  companion: string | null
}

type AllotmentRow = {
  price_per_night: number
}

function nightCount(checkin: string, checkout: string): number {
  return Math.max(
    0,
    Math.round(
      (new Date(checkout).getTime() - new Date(checkin).getTime()) / 86_400_000
    )
  )
}

export default async function (req: { params: Params; user: User }) {
  const { booking_id, room_type, checkin, checkout, companion } = req.params
  const changedBy = req.user?.email ?? req.user?.fullName ?? "admin"

  // 1. Get current booking (cast dates to text for comparison)
  const bookingRes = await retoolDb.query<BookingRow>(
    `SELECT id, full_name, hotel, room_type,
            TO_CHAR(checkin, 'YYYY-MM-DD')  AS checkin,
            TO_CHAR(checkout, 'YYYY-MM-DD') AS checkout,
            amount, companion
     FROM "bookingsData"
     WHERE id = $1`,
    [booking_id]
  )

  const curr = bookingRes.data[0]
  if (!curr) throw new Error(`Booking ${booking_id} not found`)

  // 2. Determine if pricing fields changed
  const pricingChanged =
    room_type !== curr.room_type ||
    checkin !== curr.checkin ||
    checkout !== curr.checkout

  const oldAmount = curr.amount ?? 0
  let newAmount = oldAmount

  // 3. Recalculate amount if pricing fields changed
  if (pricingChanged) {
    const alloRes = await retoolDb.query<AllotmentRow>(
      `SELECT price_per_night FROM allotments
       WHERE hotel = $1 AND room_type = $2
       LIMIT 1`,
      [curr.hotel, room_type]
    )
    const pricePerNight = alloRes.data[0]?.price_per_night ?? 0
    newAmount = Math.round(pricePerNight * nightCount(checkin, checkout))
  }

  const amountDelta = newAmount - oldAmount

  // 4. UPDATE bookingsData
  await retoolDb.query(
    `UPDATE "bookingsData"
     SET room_type = $1, checkin = $2, checkout = $3,
         companion = $4, amount = $5
     WHERE id = $6`,
    [room_type, checkin, checkout, companion.trim() || null, newAmount, booking_id]
  )

  // 5. Log each changed field into changes table
  const guestName = curr.full_name ?? "Unknown"
  const hotel = curr.hotel ?? ""
  const requiresPayment = amountDelta > 0 ? "yes" : "no"
  const requiresRefund = amountDelta < 0 ? "yes" : "no"

  type ChangeEntry = { description: string; oldVal: string; newVal: string }
  const changedFields: ChangeEntry[] = []

  if (room_type !== curr.room_type) {
    changedFields.push({
      description: "Άλλαξε τύπο δωματίου",
      oldVal: curr.room_type ?? "",
      newVal: room_type,
    })
  }
  if (checkin !== curr.checkin) {
    changedFields.push({
      description: "Άλλαξε ημερομηνία check-in",
      oldVal: curr.checkin ?? "",
      newVal: checkin,
    })
  }
  if (checkout !== curr.checkout) {
    changedFields.push({
      description: "Άλλαξε ημερομηνία check-out",
      oldVal: curr.checkout ?? "",
      newVal: checkout,
    })
  }

  const normalizedNew = companion.trim()
  const normalizedCurr = (curr.companion ?? "").trim()
  if (normalizedNew !== normalizedCurr) {
    changedFields.push({
      description: "Άλλαξε συνοδό",
      oldVal: curr.companion ?? "",
      newVal: companion.trim(),
    })
  }

  for (const field of changedFields) {
    const changeId = `CHG-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`
    await retoolDb.query(
      `INSERT INTO changes
         (change_id, booking_id, guest_name, hotel, changed_by, changed_at,
          change_description, old_value, new_value, amount_delta,
          requires_payment, requires_refund)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, $11)`,
      [
        changeId,
        String(booking_id),
        guestName,
        hotel,
        changedBy,
        field.description,
        field.oldVal,
        field.newVal,
        amountDelta,
        requiresPayment,
        requiresRefund,
      ]
    )
  }

  return {
    success: true,
    newAmount,
    amountDelta,
    changesLogged: changedFields.length,
  }
}
