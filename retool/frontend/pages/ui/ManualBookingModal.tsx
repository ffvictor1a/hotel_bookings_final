import { useState } from "react"
import { CheckCircle2, Plus, Trash2 } from "lucide-react"
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

// ── constants ─────────────────────────────────────────────────────────────────
const HOTELS = [
  "Ace Hotel & Swim Club",
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
  { value: "pending",   label: "Εκκρεμής (Pending)" },
  { value: "paid",      label: "Πληρωμένη (Paid)" },
  { value: "confirmed", label: "Επιβεβαιωμένη (Confirmed)" },
  { value: "hosted",    label: "Hosted (Δωρεάν)" },
]

// ── types ─────────────────────────────────────────────────────────────────────
type RoomFormEntry = {
  hotel: string
  room_type: string
  guests: number
  amount: string
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
const emptyRoom = (): RoomFormEntry => ({ hotel: "", room_type: "", guests: 1, amount: "" })

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

// ── sub-components ────────────────────────────────────────────────────────────
function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string | undefined
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive mt-0.5">{error}</p>}
    </div>
  )
}

type RoomRowProps = {
  idx: number
  room: RoomFormEntry
  errors: Record<string, string>
  canRemove: boolean
  onRemove: () => void
  onChange: (key: keyof RoomFormEntry, value: string | number) => void
}

function RoomRow({ idx, room, errors, canRemove, onRemove, onChange }: RoomRowProps) {
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
              <SelectTrigger>
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
        <Field label="Αριθμός Επισκεπτών" error={errors[`room_${idx}_guests`]}>
          <Input
            type="number"
            min={1}
            value={room.guests}
            onChange={(e) => onChange("guests", Math.max(1, parseInt(e.target.value) || 1))}
          />
        </Field>
        <div className="col-span-2">
          <Field label="Ποσό (€)" error={errors[`room_${idx}_amount`]}>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={room.amount}
              onChange={(e) => onChange("amount", e.target.value)}
              placeholder="0.00"
            />
          </Field>
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

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.full_name.trim()) errs["full_name"] = "Απαιτείται"
    if (!form.checkin) errs["checkin"] = "Απαιτείται"
    if (!form.checkout) errs["checkout"] = "Απαιτείται"
    if (form.checkin && form.checkout && form.checkin >= form.checkout)
      errs["checkout"] = "Πρέπει να είναι μετά το check-in"
    form.rooms.forEach((room, idx) => {
      if (!room.hotel) errs[`room_${idx}_hotel`] = "Απαιτείται"
      if (!room.room_type) errs[`room_${idx}_room_type`] = "Απαιτείται"
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
          amount: r.amount !== "" ? parseFloat(r.amount) : 0,
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-base font-semibold">Χειροκίνητη Κράτηση</DialogTitle>
        </DialogHeader>

        {/* ── Success state ─────────────────────────────────────────── */}
        {successMsg ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <p className="text-lg font-semibold text-foreground">{successMsg}</p>
          </div>
        ) : (
          <>
            {/* ── Form ──────────────────────────────────────────────── */}
            <div className="overflow-y-auto max-h-[70vh] px-6 py-5 space-y-6">

              {/* Guest info */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Στοιχεία Επισκέπτη
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Field label="Ονοματεπώνυμο *" error={errors["full_name"]}>
                      <Input
                        value={form.full_name}
                        onChange={(e) => setField("full_name", e.target.value)}
                        placeholder="π.χ. Γιώργος Παπαδόπουλος"
                      />
                    </Field>
                  </div>
                  <Field label="Email" error={errors["email"]}>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      placeholder="email@example.com"
                    />
                  </Field>
                  <Field label="Κινητό" error={errors["mobile"]}>
                    <Input
                      value={form.mobile}
                      onChange={(e) => setField("mobile", e.target.value)}
                      placeholder="+30 69..."
                    />
                  </Field>
                  <Field label="Συνοδός" error={errors["companion"]}>
                    <Input
                      value={form.companion}
                      onChange={(e) => setField("companion", e.target.value)}
                      placeholder="Όνομα συνοδού (προαιρετικό)"
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
                  <Field label="Check-in *" error={errors["checkin"]}>
                    <Input
                      type="date"
                      value={form.checkin}
                      onChange={(e) => setField("checkin", e.target.value)}
                    />
                  </Field>
                  <Field label="Check-out *" error={errors["checkout"]}>
                    <Input
                      type="date"
                      value={form.checkout}
                      onChange={(e) => setField("checkout", e.target.value)}
                    />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Κατάσταση" error={errors["status"]}>
                      <Select value={form.status} onValueChange={(v) => setField("status", v)}>
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
                    placeholder='π.χ. "χειροκίνητη καταχώρηση - τραπεζικό έμβασμα" ή "hosted guest - δωρεάν συμμετοχή"'
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
                    <Label htmlFor="group-toggle" className="text-xs text-muted-foreground cursor-pointer select-none">
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
