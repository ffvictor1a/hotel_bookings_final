import { useState, useEffect } from "react"
import { CheckCircle2, Plus, Trash2, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../lib/shadcn/dialog"
import { Label } from "../../lib/shadcn/label"
import { Input } from "../../lib/shadcn/input"
import { Button } from "../../lib/shadcn/button"
import { Textarea } from "../../lib/shadcn/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../lib/shadcn/select"
import { Switch } from "../../lib/shadcn/switch"
import { useCreateBooking } from "../../hooks/backend/bookings"
import { useGetAllotments } from "../../hooks/backend/allotments"
import type { Allotment } from "../data/types"

// ── constants ─────────────────────────────────────────────────────────────────
const HOTELS = [
  "Ace Hotel & Swim Club Athens",
  "Athens Coast Hotel",
  "Congo Palace",
  "Dusit Suites Athens",
  "Emmantina Hotel",
  "Glyfada Riviera Hotel",
  "Poseidon Grand Hotel",
  "Seaview Cityscape Hotel",
]

const ROOM_TYPES = ["Μονόκλινο", "Δίκλινο", "Τρίκλινο"]

const STATUSES = [
  { value: "pending",    label: "Εκκρεμής (Pending)" },
  { value: "paid",       label: "Πληρωμένη (Paid)" },
  { value: "cancelled",  label: "Ακυρωμένη (Cancelled)" },
  { value: "waitlisted", label: "Λίστα Αναμονής (Waitlisted)" },
  { value: "hosted",     label: "Hosted (Δωρεάν)" },
]

const MAX_NIGHTS = 60
const MAX_GUESTS = 10
const MIN_DATE_OFFSET_YEARS = 1   // allow bookings up to 1 year in the past
const MAX_DATE_OFFSET_YEARS = 3   // allow bookings up to 3 years in the future

// ── types ─────────────────────────────────────────────────────────────────────
type RoomFormEntry = {
  hotel: string
  room_type: string
  guests: number
}

type FormData = {
  full_name: string
  email: string
  mobile: string
  checkin: string
  checkout: string
  companion: string
  status: string
  notes: string
  group_name: string
  isGroupBooking: boolean
  rooms: RoomFormEntry[]
}

// ── helpers ───────────────────────────────────────────────────────────────────
const emptyRoom = (): RoomFormEntry => ({ hotel: "", room_type: "", guests: 1 })

const initialForm = (): FormData => ({
  full_name: "",
  email: "",
  mobile: "",
  checkin: "",
  checkout: "",
  companion: "",
  status: "pending",
  notes: "",
  group_name: "",
  isGroupBooking: false,
  rooms: [emptyRoom()],
})

function nightCount(checkin: string, checkout: string): number {
  if (!checkin || !checkout) return 0
  return Math.max(
    0,
    Math.round(
      (new Date(checkout).getTime() - new Date(checkin).getTime()) / 86_400_000
    )
  )
}

function computeRoomAmount(
  room: RoomFormEntry,
  checkin: string,
  checkout: string,
  status: string,
  allotments: Allotment[]
): number {
  if (status === "hosted") return 0
  if (!room.hotel || !room.room_type || !checkin || !checkout) return 0
  const a = allotments.find(
    (x) => x.hotel === room.hotel && x.room_type === room.room_type
  )
  if (!a) return 0
  return Math.round(a.price_per_night * nightCount(checkin, checkout))
}

function fmtEur(n: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n)
}

// ── validation helpers ────────────────────────────────────────────────────────
/** Strips spaces, dashes, dots, parentheses then checks digit count (8-15). */
function validatePhone(phone: string): string | null {
  const raw = phone.trim()
  if (!raw) return null // optional field
  const digits = raw.replace(/[\s\-().]/g, "").replace(/^\+/, "")
  if (!/^\d+$/.test(digits)) return "Επιτρέπονται μόνο ψηφία, +, κενά και παύλες"
  if (digits.length < 8) return "Πολύ λίγα ψηφία (ελάχιστο 8)"
  if (digits.length > 15) return "Πολλά ψηφία (μέγιστο 15)"
  return null
}

function validateEmail(email: string): string | null {
  const raw = email.trim()
  if (!raw) return null // optional field
  // RFC 5322 simplified check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw)) return "Μη έγκυρο email"
  return null
}

function validateCheckin(checkin: string): string | null {
  if (!checkin) return "Απαιτείται ημερομηνία άφιξης"
  const d = new Date(checkin)
  if (isNaN(d.getTime())) return "Μη έγκυρη ημερομηνία"
  const past = new Date()
  past.setFullYear(past.getFullYear() - MIN_DATE_OFFSET_YEARS)
  const future = new Date()
  future.setFullYear(future.getFullYear() + MAX_DATE_OFFSET_YEARS)
  if (d < past) return `Η ημερομηνία δεν μπορεί να είναι πριν από ${MIN_DATE_OFFSET_YEARS} χρόνο`
  if (d > future) return `Η ημερομηνία δεν μπορεί να υπερβαίνει τα ${MAX_DATE_OFFSET_YEARS} χρόνια από σήμερα`
  return null
}

function validateCheckout(checkin: string, checkout: string): string | null {
  if (!checkout) return "Απαιτείται ημερομηνία αναχώρησης"
  const d = new Date(checkout)
  if (isNaN(d.getTime())) return "Μη έγκυρη ημερομηνία"
  if (checkin && checkout <= checkin) return "Η αναχώρηση πρέπει να είναι μετά την άφιξη"
  const nights = nightCount(checkin, checkout)
  if (nights > MAX_NIGHTS) return `Η διαμονή δεν μπορεί να υπερβαίνει τις ${MAX_NIGHTS} νύχτες`
  return null
}

function validateGuests(guests: number): string | null {
  if (!Number.isInteger(guests) || guests < 1) return "Ελάχιστος αριθμός επισκεπτών: 1"
  if (guests > MAX_GUESTS) return `Μέγιστος αριθμός επισκεπτών: ${MAX_GUESTS}`
  return null
}

// ── sub-components ────────────────────────────────────────────────────────────
function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string | undefined
  hint?: string | undefined
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive mt-0.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

type RoomRowProps = {
  idx: number
  room: RoomFormEntry
  errors: Record<string, string>
  canRemove: boolean
  computedAmount: number
  onRemove: () => void
  onChange: (key: keyof RoomFormEntry, value: string | number) => void
}

function RoomRow({ idx, room, errors, canRemove, computedAmount, onRemove, onChange }: RoomRowProps) {
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
      {canRemove && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Δωμάτιο {idx + 1}</span>
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Αφαίρεση δωματίου"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Ξενοδοχείο *" error={errors[`room_${idx}_hotel`]}>
            <Select value={room.hotel} onValueChange={(v) => onChange("hotel", v)}>
              <SelectTrigger className={errors[`room_${idx}_hotel`] ? "border-destructive" : ""}>
                <SelectValue placeholder="Επιλέξτε ξενοδοχείο" />
              </SelectTrigger>
              <SelectContent>
                {HOTELS.map((h) => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Τύπος Δωματίου *" error={errors[`room_${idx}_room_type`]}>
          <Select value={room.room_type} onValueChange={(v) => onChange("room_type", v)}>
            <SelectTrigger className={errors[`room_${idx}_room_type`] ? "border-destructive" : ""}>
              <SelectValue placeholder="Επιλέξτε τύπο" />
            </SelectTrigger>
            <SelectContent>
              {ROOM_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Αριθμός Επισκεπτών"
          error={errors[`room_${idx}_guests`]}
          hint={`1 – ${MAX_GUESTS}`}
        >
          <Input
            type="number"
            min={1}
            max={MAX_GUESTS}
            value={room.guests}
            className={errors[`room_${idx}_guests`] ? "border-destructive" : ""}
            onChange={(e) => onChange("guests", Math.min(MAX_GUESTS, Math.max(1, parseInt(e.target.value) || 1)))}
          />
        </Field>
        {/* Auto-calculated read-only amount */}
        <div className="col-span-2 space-y-1">
          <Label className="text-sm font-medium text-foreground">Ποσό (€) — αυτόματο</Label>
          <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-semibold text-foreground tabular-nums select-none">
            {fmtEur(computedAmount)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Υπολογίζεται αυτόματα · status "hosted" = €0
          </p>
        </div>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────
type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ManualBookingModal({ open, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<FormData>(initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const { trigger, loading } = useCreateBooking()
  const { data: alloData, trigger: alloTrigger } = useGetAllotments()
  const allotments = (alloData as Allotment[] | undefined) ?? []

  useEffect(() => {
    if (open) alloTrigger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleClose() {
    setForm(initialForm)
    setErrors({})
    setSuccessMsg(null)
    onClose()
  }

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: "" }))
  }

  function setRoomField(idx: number, key: keyof RoomFormEntry, value: string | number) {
    setForm((f) => {
      const rooms = [...f.rooms]
      rooms[idx] = { ...rooms[idx]!, [key]: value }
      return { ...f, rooms }
    })
    setErrors((e) => ({ ...e, [`room_${idx}_${key}`]: "" }))
  }

  function addRoom() {
    setForm((f) => ({ ...f, rooms: [...f.rooms, emptyRoom()] }))
  }

  function removeRoom(idx: number) {
    setForm((f) => ({ ...f, rooms: f.rooms.filter((_, i) => i !== idx) }))
  }

  // ── Comprehensive validation ──────────────────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {}

    // Name
    const name = form.full_name.trim()
    if (!name) errs["full_name"] = "Απαιτείται ονοματεπώνυμο"
    else if (name.length < 2) errs["full_name"] = "Ελάχιστο 2 χαρακτήρες"
    else if (name.length > 100) errs["full_name"] = "Μέγιστο 100 χαρακτήρες"

    // Email (optional)
    const emailErr = validateEmail(form.email)
    if (emailErr) errs["email"] = emailErr

    // Mobile (optional)
    const phoneErr = validatePhone(form.mobile)
    if (phoneErr) errs["mobile"] = phoneErr

    // Companion name length (optional)
    if (form.companion.trim().length > 100)
      errs["companion"] = "Μέγιστο 100 χαρακτήρες"

    // Check-in
    const checkinErr = validateCheckin(form.checkin)
    if (checkinErr) errs["checkin"] = checkinErr

    // Check-out (only if check-in passes)
    if (!errs["checkin"]) {
      const checkoutErr = validateCheckout(form.checkin, form.checkout)
      if (checkoutErr) errs["checkout"] = checkoutErr
    } else if (!form.checkout) {
      errs["checkout"] = "Απαιτείται ημερομηνία αναχώρησης"
    }

    // Per-room
    form.rooms.forEach((room, idx) => {
      if (!room.hotel) errs[`room_${idx}_hotel`] = "Απαιτείται"
      if (!room.room_type) errs[`room_${idx}_room_type`] = "Απαιτείται"
      const guestErr = validateGuests(room.guests)
      if (guestErr) errs[`room_${idx}_guests`] = guestErr
    })

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    try {
      await trigger({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        checkin: form.checkin,
        checkout: form.checkout,
        companion: form.companion.trim(),
        status: form.status,
        notes: form.notes.trim(),
        group_name: form.group_name.trim(),
        rooms: form.rooms.map((r) => ({
          hotel: r.hotel,
          room_type: r.room_type,
          guests: r.guests,
          amount: computeRoomAmount(r, form.checkin, form.checkout, form.status, allotments),
        })),
      })
      const msg =
        form.rooms.length > 1
          ? `${form.rooms.length} κρατήσεις καταχωρήθηκαν επιτυχώς!`
          : "Η κράτηση καταχωρήθηκε επιτυχώς!"
      setSuccessMsg(msg)
      onSuccess()
      setTimeout(() => handleClose(), 1800)
    } catch (err) {
      setErrors((e) => ({ ...e, submit: String(err) }))
    }
  }

  // count total validation errors for summary banner
  const errorCount = Object.values(errors).filter(Boolean).length

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border pr-14">
          <DialogTitle className="text-base font-semibold text-foreground">
            Χειροκίνητη Κράτηση
          </DialogTitle>
        </DialogHeader>

        {/* ── Success state ──────────────────────────────────────────── */}
        {successMsg ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <p className="text-lg font-semibold text-foreground">{successMsg}</p>
          </div>
        ) : (
          <>
            {/* ── Form ──────────────────────────────────────────────── */}
            <div className="overflow-y-auto max-h-[70vh] px-6 py-5 space-y-6">

              {/* Validation summary banner */}
              {errorCount > 0 && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorCount === 1
                    ? "Υπάρχει 1 σφάλμα που χρειάζεται διόρθωση."
                    : `Υπάρχουν ${errorCount} σφάλματα που χρειάζονται διόρθωση.`}
                </div>
              )}

              {/* Guest info */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Στοιχεία Επισκέπτη
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Field
                      label="Ονοματεπώνυμο *"
                      error={errors["full_name"]}
                      hint="2 – 100 χαρακτήρες"
                    >
                      <Input
                        value={form.full_name}
                        className={errors["full_name"] ? "border-destructive" : ""}
                        onChange={(e) => setField("full_name", e.target.value)}
                        placeholder="π.χ. Γιώργος Παπαδόπουλος"
                        maxLength={100}
                      />
                    </Field>
                  </div>
                  <Field
                    label="Email"
                    error={errors["email"]}
                    hint="Προαιρετικό"
                  >
                    <Input
                      type="email"
                      value={form.email}
                      className={errors["email"] ? "border-destructive" : ""}
                      onChange={(e) => setField("email", e.target.value)}
                      placeholder="email@example.com"
                    />
                  </Field>
                  <Field
                    label="Κινητό"
                    error={errors["mobile"]}
                    hint="Προαιρετικό · π.χ. 6901234567"
                  >
                    <Input
                      value={form.mobile}
                      className={errors["mobile"] ? "border-destructive" : ""}
                      onChange={(e) => setField("mobile", e.target.value)}
                      placeholder="+30 6901234567"
                    />
                  </Field>
                  <Field label="Συνοδός" error={errors["companion"]}>
                    <Input
                      value={form.companion}
                      className={errors["companion"] ? "border-destructive" : ""}
                      onChange={(e) => setField("companion", e.target.value)}
                      placeholder="Όνομα συνοδού (προαιρετικό)"
                      maxLength={100}
                    />
                  </Field>
                  <Field label="Όνομα Ομάδας (Group)" error={errors["group_name"]}>
                    <Input
                      value={form.group_name}
                      onChange={(e) => setField("group_name", e.target.value)}
                      placeholder="π.χ. Team Alpha (προαιρετικό)"
                    />
                  </Field>
                </div>
              </section>

              {/* Dates & status */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Ημερομηνίες & Κατάσταση
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Check-in *"
                    error={errors["checkin"]}
                    hint="Άφιξη"
                  >
                    <Input
                      type="date"
                      value={form.checkin}
                      className={errors["checkin"] ? "border-destructive" : ""}
                      onChange={(e) => {
                        setField("checkin", e.target.value)
                        // re-validate checkout against new checkin
                        if (form.checkout) {
                          const err = validateCheckout(e.target.value, form.checkout)
                          setErrors((prev) => ({ ...prev, checkout: err ?? "" }))
                        }
                      }}
                    />
                  </Field>
                  <Field
                    label="Check-out *"
                    error={errors["checkout"]}
                    hint={
                      form.checkin && form.checkout && !errors["checkin"] && !errors["checkout"]
                        ? `${nightCount(form.checkin, form.checkout)} νύχτ${nightCount(form.checkin, form.checkout) === 1 ? "α" : "ες"}`
                        : "Αναχώρηση"
                    }
                  >
                    <Input
                      type="date"
                      value={form.checkout}
                      min={form.checkin || undefined}
                      className={errors["checkout"] ? "border-destructive" : ""}
                      onChange={(e) => setField("checkout", e.target.value)}
                    />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Κατάσταση" error={errors["status"]}>
                      <Select
                        value={form.status}
                        onValueChange={(v) => {
                          setField("status", v)
                          // clear checkout error (hosted → amount changes but dates ok)
                          setErrors((e) => ({ ...e, status: "" }))
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>
              </section>

              {/* Notes */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Σημειώσεις
                </h3>
                <Field label="" error={errors["notes"]}>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    rows={3}
                    placeholder='π.χ. "χειροκίνητη καταχώρηση - τραπεζικό έμβασμα"'
                  />
                </Field>
              </section>

              {/* Rooms */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Δωμάτιο / Δωμάτια
                  </h3>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="group-toggle"
                      className="text-xs text-muted-foreground cursor-pointer select-none"
                    >
                      Πολλαπλά δωμάτια (group)
                    </Label>
                    <Switch
                      id="group-toggle"
                      checked={form.isGroupBooking}
                      onCheckedChange={(v) => {
                        setField("isGroupBooking", v)
                        if (!v) setForm((f) => ({ ...f, isGroupBooking: false, rooms: [f.rooms[0] ?? emptyRoom()] }))
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {form.rooms.map((room, idx) => (
                    <RoomRow
                      key={idx}
                      idx={idx}
                      room={room}
                      errors={errors}
                      canRemove={form.rooms.length > 1}
                      computedAmount={computeRoomAmount(
                        room, form.checkin, form.checkout, form.status, allotments
                      )}
                      onRemove={() => removeRoom(idx)}
                      onChange={(key, val) => setRoomField(idx, key, val)}
                    />
                  ))}
                </div>

                {form.isGroupBooking && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={addRoom}
                  >
                    <Plus className="w-4 h-4" />
                    Πρόσθεσε άλλο δωμάτιο
                  </Button>
                )}
              </section>

              {errors["submit"] && (
                <p className="text-sm text-destructive border border-destructive/20 bg-destructive/10 rounded-md px-3 py-2">
                  {errors["submit"]}
                </p>
              )}
            </div>

            {/* ── Footer ────────────────────────────────────────────── */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Ακύρωση
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Καταχώρηση..." : "Καταχώρηση"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
