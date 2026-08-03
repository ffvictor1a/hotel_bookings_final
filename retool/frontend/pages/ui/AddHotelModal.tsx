import { useState, type ReactNode } from "react"
import { Plus, Trash2, CheckCircle2, Mail } from "lucide-react"
import { Switch } from "../../lib/shadcn/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../lib/shadcn/dialog"
import { Label } from "../../lib/shadcn/label"
import { Input } from "../../lib/shadcn/input"
import { Button } from "../../lib/shadcn/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../lib/shadcn/select"
import { useAddHotel } from "../../hooks/backend/hotels"
import { useLanguage } from "../../utils/LanguageContext"
import type { Translations } from "../../utils/translations"

const ROOM_TYPES = ["Μονόκλινο", "Δίκλινο", "Τρίκλινο"]

let _keyCounter = 0
function nextKey() { return ++_keyCounter }

// ── Types ─────────────────────────────────────────────────────────────────────
type RoomEntry = {
  _key: number
  room_type: string
  total_allotment: string
  price_per_night: string
  deadline: string
}

// breakfast option type
type BreakfastOption = "none" | "included" | "extra"

type FormState = {
  hotel_name: string
  location: string
  phone: string
  hotel_email: string
  hotel_email_cc: string
  stars: number | null
  email_notifications_enabled: boolean
  breakfast_option: BreakfastOption
  breakfast_extra_price: string
  room_types: RoomEntry[]
}

function emptyRoom(): RoomEntry {
  return { _key: nextKey(), room_type: "", total_allotment: "", price_per_night: "", deadline: "" }
}

function initialForm(): FormState {
  return {
    hotel_name: "",
    location: "",
    phone: "",
    hotel_email: "",
    hotel_email_cc: "",
    stars: null,
    email_notifications_enabled: true,
    breakfast_option: "included",
    breakfast_extra_price: "",
    room_types: [emptyRoom()],
  }
}

// ── Validation ────────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(form: FormState, t: Translations): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!form.hotel_name.trim()) errs["hotel_name"] = t.validHotelNameRequired
  if (!form.hotel_email.trim() || !EMAIL_RE.test(form.hotel_email.trim()))
    errs["hotel_email"] = t.validHotelEmailRequired
  if (form.stars === null)
    errs["stars"] = t.validRequired
  if (form.breakfast_option === "extra" && (!form.breakfast_extra_price || Number(form.breakfast_extra_price) <= 0))
    errs["breakfast_extra_price"] = t.validRequired

  form.room_types.forEach((rt, idx) => {
    if (!rt.room_type) errs[`rt_${idx}_room_type`] = t.validRequired
    if (!rt.total_allotment || Number(rt.total_allotment) < 1)
      errs[`rt_${idx}_total_allotment`] = t.validAllotmentMin
    if (!rt.price_per_night || Number(rt.price_per_night) < 0)
      errs[`rt_${idx}_price_per_night`] = t.validRequired
    if (!rt.deadline) errs[`rt_${idx}_deadline`] = t.validRequired
  })
  return errs
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function FieldWrap({
  label, error, children,
}: { label: string; error?: string | undefined; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive mt-0.5">{error}</p>}
    </div>
  )
}

// ── Room type row ─────────────────────────────────────────────────────────────
type RoomTypeRowProps = {
  idx: number
  entry: RoomEntry
  errors: Record<string, string>
  canRemove: boolean
  onRemove: () => void
  onChange: (key: keyof Omit<RoomEntry, "_key">, value: string) => void
}

function RoomTypeRow({ idx, entry, errors, canRemove, onRemove, onChange }: RoomTypeRowProps) {
  const { t } = useLanguage()
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
      {canRemove && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{t.roomTypeIndex} {idx + 1}</span>
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label={t.removeRoomTypeAriaLabel}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <FieldWrap label={t.roomTypeFieldLabel} error={errors[`rt_${idx}_room_type`]}>
            <Select
              {...(entry.room_type ? { value: entry.room_type } : {})}
              onValueChange={(v) => onChange("room_type", v)}
            >
              <SelectTrigger className={errors[`rt_${idx}_room_type`] ? "border-destructive" : ""}>
                <SelectValue placeholder={t.selectType} />
              </SelectTrigger>
              <SelectContent>
                {ROOM_TYPES.map((rt) => <SelectItem key={rt} value={rt}>{rt}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWrap>
        </div>

        <FieldWrap label={t.allotmentLabel} error={errors[`rt_${idx}_total_allotment`]}>
          <Input
            type="number" min={1}
            value={entry.total_allotment}
            onChange={(e) => onChange("total_allotment", e.target.value)}
            placeholder="π.χ. 20"
            className={errors[`rt_${idx}_total_allotment`] ? "border-destructive" : ""}
          />
        </FieldWrap>

        <FieldWrap label={t.pricePerNightLabel} error={errors[`rt_${idx}_price_per_night`]}>
          <Input
            type="number" min={0}
            value={entry.price_per_night}
            onChange={(e) => onChange("price_per_night", e.target.value)}
            placeholder="π.χ. 120"
            className={errors[`rt_${idx}_price_per_night`] ? "border-destructive" : ""}
          />
        </FieldWrap>

        <div className="col-span-2">
          <FieldWrap label={t.deadlineLabel} error={errors[`rt_${idx}_deadline`]}>
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
  const { t } = useLanguage()
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
      room_types: f.room_types.map((r) => r._key === key ? { ...r, [field]: value } : r),
    }))
    setForm((f) => {
      const idx = f.room_types.findIndex((r) => r._key === key)
      if (idx >= 0) setErrors((e) => ({ ...e, [`rt_${idx}_${field}`]: "" }))
      return f
    })
  }

  function validate(): boolean {
    const errs = validateForm(form, t)
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
        hotel_email: form.hotel_email.trim(),
        hotel_email_cc: form.hotel_email_cc.trim() || null,
        stars: form.stars,
        email_notifications_enabled: form.email_notifications_enabled,
        breakfast_included: form.breakfast_option !== "none",
        breakfast_extra_price: form.breakfast_option === "extra" && form.breakfast_extra_price
          ? Math.round(Number(form.breakfast_extra_price))
          : null,
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
          <DialogTitle className="text-base font-semibold">{t.addHotelTitle}</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <p className="text-lg font-semibold text-foreground">{t.hotelSaved}</p>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto max-h-[70vh] px-6 py-5 space-y-6">

              {/* ── Basic info ─────────────────────────────────────── */}
              <section className="space-y-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t.basicInfoSection}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <FieldWrap label={t.hotelNameLabel} error={errors["hotel_name"]}>
                      <Input
                        value={form.hotel_name}
                        onChange={(e) => setField("hotel_name", e.target.value)}
                        placeholder="π.χ. Glyfada Riviera Hotel"
                        className={errors["hotel_name"] ? "border-destructive" : ""}
                      />
                    </FieldWrap>
                  </div>
                  <FieldWrap label={t.locationLabel}>
                    <Input value={form.location}
                      onChange={(e) => setField("location", e.target.value)}
                      placeholder="π.χ. Γλυφάδα, Αθήνα" />
                  </FieldWrap>
                  <FieldWrap label={t.phoneLabel}>
                    <Input value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                      placeholder="π.χ. 210 123 4567" />
                  </FieldWrap>
                  <div className="sm:col-span-2">
                    <FieldWrap label={t.hotelEmailLabel} error={errors["hotel_email"]}>
                      <Input
                        type="email"
                        value={form.hotel_email}
                        onChange={(e) => setField("hotel_email", e.target.value)}
                        placeholder="π.χ. info@hotel.gr"
                        className={errors["hotel_email"] ? "border-destructive" : ""}
                      />
                    </FieldWrap>
                  </div>
                  <div className="sm:col-span-2">
                    <FieldWrap label={t.hotelEmailCcLabel}>
                      <Input
                        type="text"
                        value={form.hotel_email_cc}
                        onChange={(e) => setField("hotel_email_cc", e.target.value)}
                        placeholder="π.χ. assistant@hotel.gr, reception@hotel.gr"
                      />
                    </FieldWrap>
                  </div>

                  {/* ── Hotel category dropdown ── */}
                  <div className="sm:col-span-2">
                    <FieldWrap label={t.hotelCategoryLabel} error={errors["stars"]}>
                      <Select
                        {...(form.stars !== null ? { value: String(form.stars) } : {})}
                        onValueChange={(v) => setField("stars", Number(v))}
                      >
                        <SelectTrigger className={errors["stars"] ? "border-destructive" : ""}>
                          <SelectValue placeholder={t.selectCategory} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">{t.stars3}</SelectItem>
                          <SelectItem value="4">{t.stars4}</SelectItem>
                          <SelectItem value="5">{t.stars5}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldWrap>
                  </div>

                  {/* ── Breakfast dropdown ── */}
                  <div className="sm:col-span-2 space-y-3">
                    <FieldWrap label={t.breakfastIncludedLabel}>
                      <Select
                        value={form.breakfast_option}
                        onValueChange={(v) => {
                          setField("breakfast_option", v as BreakfastOption)
                          if (v !== "extra") {
                            setField("breakfast_extra_price", "")
                            setErrors((e) => ({ ...e, breakfast_extra_price: "" }))
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t.breakfastNone}</SelectItem>
                          <SelectItem value="included">{t.breakfastIncluded}</SelectItem>
                          <SelectItem value="extra">{t.breakfastExtra}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldWrap>

                    {form.breakfast_option === "extra" && (
                      <FieldWrap label={t.breakfastExtraPriceLabel} error={errors["breakfast_extra_price"]}>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={form.breakfast_extra_price}
                          onChange={(e) => setField("breakfast_extra_price", e.target.value)}
                          placeholder="π.χ. 15"
                          className={errors["breakfast_extra_price"] ? "border-destructive" : ""}
                        />
                      </FieldWrap>
                    )}
                  </div>

                  {/* ── Email notifications toggle ── */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="email-notif-toggle"
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium text-foreground">
                          {t.emailNotificationsLabel}
                        </span>
                      </div>
                      <Switch
                        id="email-notif-toggle"
                        checked={form.email_notifications_enabled}
                        onCheckedChange={(v) => setField("email_notifications_enabled", v)}
                      />
                    </label>
                  </div>
                </div>
              </section>

              {/* ── Room types ─────────────────────────────────────── */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t.roomTypesSection}
                  </h3>
                  <Button type="button" variant="outline" size="sm"
                    onClick={addRoom}
                    className="gap-1.5 text-xs h-8">
                    <Plus className="w-3.5 h-3.5" />
                    {t.addRoomTypeBtn}
                  </Button>
                </div>

                <div className="space-y-3">
                  {form.room_types.map((rt, idx) => (
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
              <Button variant="outline" onClick={handleClose} disabled={loading}>{t.cancelBtn}</Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? t.savingBtn : t.saveBtn}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
