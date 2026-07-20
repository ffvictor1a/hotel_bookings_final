import { useState } from "react"
import { Plus, Trash2, CheckCircle2, Star } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../lib/shadcn/dialog"
import { Label } from "../../lib/shadcn/label"
import { Input } from "../../lib/shadcn/input"
import { Button } from "../../lib/shadcn/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../lib/shadcn/select"
import { useAddHotel } from "../../hooks/backend/hotels"

const ROOM_TYPES = ["Μονόκλινο", "Δίκλινο", "Τρίκλινο"]

// Stable key counter — incremented each time a new room entry is created
// so React never reuses a DOM node from a different row.
let _keyCounter = 0
function nextKey() { return ++_keyCounter }

// ── Types ─────────────────────────────────────────────────────────────────────
type RoomEntry = {
  _key: number        // stable React key, never changes for the lifetime of this row
  room_type: string
  total_allotment: string
  price_per_night: string
  deadline: string
}

type FormState = {
  hotel_name: string
  location: string
  phone: string
  stars: number       // 0 = unset
  room_types: RoomEntry[]
}

function emptyRoom(): RoomEntry {
  return { _key: nextKey(), room_type: "", total_allotment: "", price_per_night: "", deadline: "" }
}

function initialForm(): FormState {
  return { hotel_name: "", location: "", phone: "", stars: 0, room_types: [emptyRoom()] }
}

// ── Small field wrapper ───────────────────────────────────────────────────────
function FieldWrap({
  label, error, children,
}: { label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive mt-0.5">{error}</p>}
    </div>
  )
}

// ── Room type row sub-component ───────────────────────────────────────────────
// Extracted as its own component (like ManualBookingModal's RoomRow) so React
// tracks it independently. Each instance owns its own reconciliation identity
// through the stable `_key` used as the React key by the parent.
type RoomTypeRowProps = {
  idx: number
  entry: RoomEntry
  errors: Record<string, string>
  canRemove: boolean
  onRemove: () => void
  onChange: (key: keyof Omit<RoomEntry, "_key">, value: string) => void
}

function RoomTypeRow({ idx, entry, errors, canRemove, onRemove, onChange }: RoomTypeRowProps) {
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
      {/* Header with label + remove button — only shown when there are multiple rows */}
      {canRemove && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Τύπος {idx + 1}</span>
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Αφαίρεση τύπου δωματίου"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Room type dropdown */}
        <div className="col-span-2">
          <FieldWrap label="Τύπος δωματίου *" error={errors[`rt_${idx}_room_type`]}>
            <Select
              {...(entry.room_type ? { value: entry.room_type } : {})}
              onValueChange={(v) => onChange("room_type", v)}
            >
              <SelectTrigger className={errors[`rt_${idx}_room_type`] ? "border-destructive" : ""}>
                <SelectValue placeholder="Επιλέξτε τύπο" />
              </SelectTrigger>
              <SelectContent>
                {ROOM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWrap>
        </div>

        {/* Allotment */}
        <FieldWrap label="Allotment *" error={errors[`rt_${idx}_total_allotment`]}>
          <Input
            type="number" min={1}
            value={entry.total_allotment}
            onChange={(e) => onChange("total_allotment", e.target.value)}
            placeholder="π.χ. 20"
            className={errors[`rt_${idx}_total_allotment`] ? "border-destructive" : ""}
          />
        </FieldWrap>

        {/* Price per night */}
        <FieldWrap label="Τιμή/νύχτα (€) *" error={errors[`rt_${idx}_price_per_night`]}>
          <Input
            type="number" min={0}
            value={entry.price_per_night}
            onChange={(e) => onChange("price_per_night", e.target.value)}
            placeholder="π.χ. 120"
            className={errors[`rt_${idx}_price_per_night`] ? "border-destructive" : ""}
          />
        </FieldWrap>

        {/* Deadline */}
        <div className="col-span-2">
          <FieldWrap label="Deadline *" error={errors[`rt_${idx}_deadline`]}>
            <Input
              type="date"
              value={entry.deadline}
              onChange={(e) => onChange("deadline", e.target.value)}
              className={errors[`rt_${idx}_deadline`] ? "border-destructive" : ""}
            />
          </FieldWrap>
        </div>
      </div>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddHotelModal({ open, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const { trigger, loading } = useAddHotel()

  function handleClose() {
    setForm(initialForm)
    setErrors({})
    setSuccess(false)
    onClose()
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: "" }))
  }

  function addRoom() {
    setForm((f) => ({ ...f, room_types: [...f.room_types, emptyRoom()] }))
  }

  function removeRoom(key: number) {
    setForm((f) => ({ ...f, room_types: f.room_types.filter((r) => r._key !== key) }))
  }

  function updateRoom(key: number, field: keyof Omit<RoomEntry, "_key">, value: string) {
    setForm((f) => ({
      ...f,
      room_types: f.room_types.map((r) =>
        r._key === key ? { ...r, [field]: value } : r
      ),
    }))
    // clear the error for that field (find its index for the error key)
    setForm((f) => {
      const idx = f.room_types.findIndex((r) => r._key === key)
      if (idx >= 0) setErrors((e) => ({ ...e, [`rt_${idx}_${field}`]: "" }))
      return f
    })
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.hotel_name.trim()) errs["hotel_name"] = "Απαιτείται όνομα ξενοδοχείου"

    form.room_types.forEach((rt, idx) => {
      if (!rt.room_type) errs[`rt_${idx}_room_type`] = "Απαιτείται"
      if (!rt.total_allotment || Number(rt.total_allotment) < 1)
        errs[`rt_${idx}_total_allotment`] = "Απαιτείται (≥ 1)"
      if (!rt.price_per_night || Number(rt.price_per_night) < 0)
        errs[`rt_${idx}_price_per_night`] = "Απαιτείται"
      if (!rt.deadline) errs[`rt_${idx}_deadline`] = "Απαιτείται"
    })

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    try {
      await trigger({
        hotel_name: form.hotel_name.trim(),
        location: form.location.trim(),
        phone: form.phone.trim(),
        stars: form.stars > 0 ? form.stars : null,
        // All room entries are sent — the full array, not just the first/last
        room_types: form.room_types.map((rt) => ({
          room_type: rt.room_type,
          total_allotment: Number(rt.total_allotment),
          price_per_night: Math.round(Number(rt.price_per_night)),
          deadline: rt.deadline,
        })),
      })
      setSuccess(true)
      onSuccess()
      setTimeout(handleClose, 1800)
    } catch (err) {
      setErrors((e) => ({ ...e, submit: String(err) }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border pr-14">
          <DialogTitle className="text-base font-semibold">Προσθήκη Ξενοδοχείου</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <p className="text-lg font-semibold text-foreground">Το ξενοδοχείο αποθηκεύτηκε!</p>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto max-h-[70vh] px-6 py-5 space-y-6">

              {/* ── Basic info ─────────────────────────────────────── */}
              <section className="space-y-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Βασικά στοιχεία
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <FieldWrap label="Όνομα ξενοδοχείου *" error={errors["hotel_name"]}>
                      <Input
                        value={form.hotel_name}
                        onChange={(e) => setField("hotel_name", e.target.value)}
                        placeholder="π.χ. Glyfada Riviera Hotel"
                        className={errors["hotel_name"] ? "border-destructive" : ""}
                      />
                    </FieldWrap>
                  </div>
                  <FieldWrap label="Τοποθεσία">
                    <Input value={form.location}
                      onChange={(e) => setField("location", e.target.value)}
                      placeholder="π.χ. Γλυφάδα, Αθήνα" />
                  </FieldWrap>
                  <FieldWrap label="Τηλέφωνο">
                    <Input value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                      placeholder="π.χ. 210 123 4567" />
                  </FieldWrap>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-sm font-medium text-foreground">Αστέρια</Label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button"
                          onClick={() => setField("stars", form.stars === n ? 0 : n)}
                          className={`p-0.5 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            form.stars >= n ? "text-amber-400" : "text-muted-foreground/25 hover:text-amber-200"
                          }`}
                          aria-label={`${n} αστέρια`}
                        >
                          <Star className={`w-7 h-7 ${form.stars >= n ? "fill-amber-400" : ""}`} />
                        </button>
                      ))}
                      {form.stars > 0 && (
                        <span className="ml-2 text-sm text-muted-foreground tabular-nums">
                          {form.stars}/5
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Room types ─────────────────────────────────────── */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Τύποι δωματίων
                  </h3>
                  <Button type="button" variant="outline" size="sm"
                    onClick={addRoom}
                    className="gap-1.5 text-xs h-8">
                    <Plus className="w-3.5 h-3.5" />
                    Πρόσθεσε τύπο δωματίου
                  </Button>
                </div>

                <div className="space-y-3">
                  {form.room_types.map((rt, idx) => (
                    // key uses rt._key (stable, never the array index) so React
                    // never reuses a row's DOM for a different row after removal.
                    <RoomTypeRow
                      key={rt._key}
                      idx={idx}
                      entry={rt}
                      errors={errors}
                      canRemove={form.room_types.length > 1}
                      onRemove={() => removeRoom(rt._key)}
                      onChange={(field, value) => updateRoom(rt._key, field, value)}
                    />
                  ))}
                </div>
              </section>

              {errors["submit"] && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                  {errors["submit"]}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <Button variant="outline" onClick={handleClose} disabled={loading}>Άκυρο</Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Αποθήκευση…" : "Αποθήκευση"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
