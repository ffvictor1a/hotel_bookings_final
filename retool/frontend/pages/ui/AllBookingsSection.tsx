import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Search, X } from "lucide-react"
import { Badge } from "../../lib/shadcn/badge"
import { Input } from "../../lib/shadcn/input"
import { Button } from "../../lib/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../lib/shadcn/card"
import { Skeleton } from "../../lib/shadcn/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../lib/shadcn/select"
import { useLanguage } from "../../utils/LanguageContext"
import type { Booking } from "../data/types"

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  paid:       "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
  pending:    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-700",
  cancelled:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-700",
  confirmed:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-700",
  waitlisted: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  hosted:     "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-700",
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" })
  } catch { return d }
}

function fmtDatetime(d: string | null | undefined) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
  } catch { return d }
}

function fmtEur(n: number | null | undefined) {
  if (n == null) return "—"
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n)
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage()
  const cls = STATUS_STYLE[status] ?? "bg-muted text-muted-foreground border-border"
  const label =
    status === "paid"       ? t.statusPaid
    : status === "pending"    ? t.statusPending
    : status === "cancelled"  ? t.statusCancelled
    : status === "confirmed"  ? t.statusConfirmed
    : status === "waitlisted" ? t.statusWaitlisted
    : status === "hosted"     ? t.statusHosted
    : status
  return <Badge variant="outline" className={`text-xs font-medium shrink-0 ${cls}`}>{label}</Badge>
}

// ── Detail row (label + value) ────────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground break-words">{String(value)}</dd>
    </div>
  )
}

// ── Booking card ──────────────────────────────────────────────────────────────
function BookingCard({ booking }: { booking: Booking }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  const billingLabel =
    booking.billing_type === "receipt" ? "Απόδειξη"
    : booking.billing_type === "invoice" ? "Τιμολόγιο"
    : null

  const nightCount = useMemo(() => {
    if (!booking.checkin || !booking.checkout) return null
    const n = Math.round(
      (new Date(booking.checkout).getTime() - new Date(booking.checkin).getTime()) / 86_400_000
    )
    return n > 0 ? n : null
  }, [booking.checkin, booking.checkout])

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* ── Collapsed row ── */}
      <button
        type="button"
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {/* expand icon */}
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {open
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />
          }
        </span>

        {/* summary row */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 sm:flex-wrap">
          {/* name */}
          <span className="font-semibold text-sm text-foreground leading-tight break-words">
            {booking.full_name ?? "—"}
          </span>

          {/* hotel · room */}
          <span className="text-xs text-muted-foreground break-words">
            {booking.hotel ?? "—"}
            {booking.room_type ? ` · ${booking.room_type}` : ""}
          </span>

          {/* dates */}
          {(booking.checkin || booking.checkout) && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {fmtDate(booking.checkin)} → {fmtDate(booking.checkout)}
              {nightCount ? ` (${nightCount}ν)` : ""}
            </span>
          )}

          {/* amount */}
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {fmtEur(booking.amount)}
          </span>

          {/* status badge */}
          <StatusBadge status={booking.status} />
        </div>
      </button>

      {/* ── Expanded detail ── */}
      {open && (
        <div className="border-t border-border bg-muted/20 px-4 py-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {/* ── Booking info ── */}
            <DetailRow label="ID" value={booking.id} />
            <DetailRow label={t.guestName} value={booking.full_name} />
            <DetailRow label={t.hotel} value={booking.hotel} />
            <DetailRow label={t.roomType} value={booking.room_type} />
            <DetailRow label={t.checkin} value={fmtDate(booking.checkin)} />
            <DetailRow label={t.checkout} value={fmtDate(booking.checkout)} />
            {nightCount !== null && (
              <DetailRow label="Διάρκεια" value={`${nightCount} νύχτ${nightCount === 1 ? "α" : "ες"}`} />
            )}
            <DetailRow label={t.amount} value={fmtEur(booking.amount)} />
            <DetailRow label={t.status} value={
              booking.status === "paid"       ? t.statusPaid
              : booking.status === "pending"    ? t.statusPending
              : booking.status === "cancelled"  ? t.statusCancelled
              : booking.status === "confirmed"  ? t.statusConfirmed
              : booking.status === "waitlisted" ? t.statusWaitlisted
              : booking.status === "hosted"     ? t.statusHosted
              : booking.status
            } />

            {/* ── Guest contact ── */}
            <DetailRow label="Email" value={booking.email} />
            <DetailRow label="Κινητό" value={booking.mobile} />
            <DetailRow label="Αριθμός ατόμων" value={booking.guests} />
            <DetailRow label="Συνοδός" value={booking.companion} />

            {/* ── Notes ── */}
            {booking.companion && <div className="sm:col-span-2 border-t border-border/50 pt-3" />}
          </dl>

          {/* Notes — full width */}
          {(() => {
            const b = booking as Booking & { notes?: string | null; special_needs?: string | null }
            return (
              <>
                {b.notes && (
                  <div className="mt-3 space-y-0.5">
                    <dt className="text-xs font-medium text-muted-foreground">Παρατηρήσεις</dt>
                    <dd className="text-sm text-foreground break-words whitespace-pre-wrap">{b.notes}</dd>
                  </div>
                )}
                {b.special_needs && (
                  <div className="mt-3 space-y-0.5">
                    <dt className="text-xs font-medium text-muted-foreground">Ειδικές ανάγκες</dt>
                    <dd className="text-sm text-foreground break-words">{b.special_needs}</dd>
                  </div>
                )}
              </>
            )
          })()}

          {/* ── Billing ── */}
          {(billingLabel || booking.company_name || booking.vat) && (
            <>
              <div className="mt-4 mb-2 border-t border-border/50 pt-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Τιμολόγηση
                </span>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <DetailRow label="Τύπος παραστατικού" value={billingLabel} />
                <DetailRow label="Επωνυμία" value={booking.company_name} />
                <DetailRow label="ΑΦΜ" value={booking.vat} />
                <DetailRow label="ΔΟΥ" value={booking.tax_office} />
                <DetailRow label="Τηλέφωνο εταιρείας" value={booking.company_phone} />
                <DetailRow label="Διεύθυνση" value={booking.company_address} />
                <DetailRow label="Email εταιρείας" value={booking.company_email} />
                <DetailRow label="Δραστηριότητα" value={booking.company_activity} />
                <DetailRow label="ΑΦΜ (απόδειξη)" value={booking.receipt_vat} />
                <DetailRow label="ΔΟΥ (απόδειξη)" value={booking.receipt_tax_office} />
              </dl>
            </>
          )}

          {/* ── Meta ── */}
          <div className="mt-4 pt-3 border-t border-border/50">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              <DetailRow label="Δημιουργήθηκε" value={fmtDatetime(booking.created_at)} />
            </dl>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
type Props = {
  bookings: Booking[]
  loading: boolean
}

const ALL_STATUSES = ["paid", "pending", "cancelled", "confirmed", "waitlisted", "hosted"] as const

export default function AllBookingsSection({ bookings, loading }: Props) {
  const { t } = useLanguage()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 10

  const statusLabel = (s: string) =>
    s === "paid"       ? t.statusPaid
    : s === "pending"    ? t.statusPending
    : s === "cancelled"  ? t.statusCancelled
    : s === "confirmed"  ? t.statusConfirmed
    : s === "waitlisted" ? t.statusWaitlisted
    : s === "hosted"     ? t.statusHosted
    : s

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return bookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false
      if (!q) return true
      return (
        (b.full_name ?? "").toLowerCase().includes(q) ||
        (b.hotel ?? "").toLowerCase().includes(q)
      )
    })
  }, [bookings, search, statusFilter])

  // Reset to page 0 whenever filters change
  const prevFilterKey = `${search}|${statusFilter}`
  const [lastFilterKey, setLastFilterKey] = useState(prevFilterKey)
  if (prevFilterKey !== lastFilterKey) {
    setLastFilterKey(prevFilterKey)
    setPage(0)
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{t.allBookings}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ── Filters ── */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="pl-9 h-9"
            />
            {search && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
                aria-label="Καθαρισμός αναζήτησης"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλες οι καταστάσεις</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Results count ── */}
        <p className="text-xs text-muted-foreground">
          {loading ? t.loadingText : `${filtered.length} ${t.bookingsCount}`}
        </p>

        {/* ── Cards ── */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t.noBookingsFound}</p>
        ) : (
          <div className="space-y-2">
            {pageItems.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-muted-foreground">
              {t.page} {safePage + 1} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>
                {t.prev}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}>
                {t.next}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
