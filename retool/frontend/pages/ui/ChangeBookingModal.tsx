import { useState, useEffect, useMemo } from "react"
import { CheckCircle2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../lib/shadcn/dialog"
import { Label } from "../../lib/shadcn/label"
import { Input } from "../../lib/shadcn/input"
import { Button } from "../../lib/shadcn/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../lib/shadcn/select"
import { useUpdateBooking } from "../../hooks/backend/bookings"
import { useGetAllotments } from "../../hooks/backend/allotments"
import type { Booking, Allotment } from "../data/types"

const ROOM_TYPES = ["Μονόκλινο", "Δίκλινο", "Τρίκλινο"]

// ── helpers ────────────────────────────────────────────────────────────────────
function nightCount(checkin: string, checkout: string): number {
  if (!checkin || !checkout) return 0
  return Math.max(
    0,
    Math.round(
      (new Date(checkout).getTime() - new Date(checkin).getTime()) / 86_400_000
    )
  )
}

function computeAmount(
  hotel: string | null,
  roomType: string,
  checkin: string,
  checkout: string,
  allotments: Allotment[]
): number {
  if (!hotel || !roomType || !checkin || !checkout) return 0
  const a = allotments.find((x) => x.hotel === hotel && x.room_type === roomType)
  if (!a) return 0
  return Math.round(a.price_per_night * nightCount(checkin, checkout))
}

function fmtEur(n: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n)
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────
type Props = {
  open: boolean
  booking: Booking | null
  onClose: () => void
  onSuccess: () => void
}

export default function ChangeBookingModal({ open, booking, onClose, onSuccess }: Props) {
  const [roomType, setRoomType] = useState("")
  const [checkin, setCheckin] = useState("")
  const [checkout, setCheckout] = useState("")
  const [companion, setCompanion] = useState("")
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { trigger: updateBooking, loading } = useUpdateBooking()
  const { data: alloData, trigger: alloTrigger } = useGetAllotments()
  const allotments = (alloData as Allotment[] | undefined) ?? []

  // Initialise form fields whenever the modal opens with a booking
  useEffect(() => {
    if (open && booking) {
      setRoomType(booking.room_type ?? "")
      setCheckin(booking.checkin ?? "")
      setCheckout(booking.checkout ?? "")
      setCompanion(booking.companion ?? "")
      setSuccessMsg(null)
      setSubmitError(null)
      alloTrigger()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking?.id])

  const computedAmount = useMemo(
    () => computeAmount(booking?.hotel ?? null, roomType, checkin, checkout, allotments),
    [booking?.hotel, roomType, checkin, checkout, allotments]
  )

  const nights = nightCount(checkin, checkout)

  function handleClose() {
    setSuccessMsg(null)
    setSubmitError(null)
    onClose()
  }

  async function handleSave() {
    if (!booking) return
    if (!roomType || !checkin || !checkout) {
      setSubmitError("Συμπληρώστε τύπο δωματίου, check-in και check-out.")
      return
    }
    if (checkin >= checkout) {
      setSubmitError("Το checkout πρέπει να είναι μετά το checkin.")
      return
    }
    setSubmitError(null)
    try {
      await updateBooking({
        booking_id: booking.id,
        room_type: roomType,
        checkin,
        checkout,
        companion,
      })
      setSuccessMsg("Οι αλλαγές αποθηκεύτηκαν επιτυχώς!")
      onSuccess()
      setTimeout(() => handleClose(), 1800)
    } catch (err) {
      setSubmitError(String(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>Αλλαγή Κράτησης</DialogTitle>
        </DialogHeader>

        {successMsg ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <p className="text-base font-semibold text-foreground">{successMsg}</p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Booking context */}
            {booking && (
              <div className="px-3 py-2 rounded-md bg-muted/50 text-sm">
                <span className="font-medium text-foreground">{booking.full_name ?? "—"}</span>
                <span className="text-muted-foreground"> — {booking.hotel ?? "—"}</span>
              </div>
            )}

            {/* Room type */}
            <Field label="Τύπος Δωματίου">
              <Select value={roomType} onValueChange={setRoomType}>
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε τύπο" />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Check-in">
                <Input
                  type="date"
                  value={checkin}
                  onChange={(e) => setCheckin(e.target.value)}
                />
              </Field>
              <Field label="Check-out">
                <Input
                  type="date"
                  value={checkout}
                  min={checkin || undefined}
                  onChange={(e) => setCheckout(e.target.value)}
                />
              </Field>
            </div>

            {/* Companion */}
            <Field label="Συνοδός">
              <Input
                value={companion}
                onChange={(e) => setCompanion(e.target.value)}
                placeholder="Όνομα συνοδού (προαιρετικό)"
              />
            </Field>

            {/* Auto-calculated amount (read-only) */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-foreground">
                Νέο Ποσό (αυτόματο)
              </Label>
              <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-semibold text-foreground tabular-nums select-none">
                {fmtEur(computedAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {nights > 0
                  ? `${nights} νύχτ${nights === 1 ? "α" : "ες"} × τιμή allotment`
                  : "Επιλέξτε έγκυρες ημερομηνίες"}
              </p>
            </div>

            {/* Error */}
            {submitError && (
              <p className="text-sm text-destructive border border-destructive/20 bg-destructive/10 rounded-md px-3 py-2">
                {submitError}
              </p>
            )}

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Ακύρωση
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Αποθήκευση..." : "Αποθήκευση"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
