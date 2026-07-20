import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../lib/shadcn/dialog"
import { Badge } from "../../lib/shadcn/badge"
import { Separator } from "../../lib/shadcn/separator"
import type { Booking } from "../data/types"

const BILLING_LABELS: Record<string, string> = {
  receipt: "Απόδειξη",
  invoice: "Τιμολόγιο",
}

const STATUS_CFG: Record<string, string> = {
  paid:       "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
  pending:    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-700",
  cancelled:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-700",
  waitlisted: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  hosted:     "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-700",
}

const STATUS_LABELS: Record<string, string> = {
  paid: "Πληρωμένη", pending: "Εκκρεμής", cancelled: "Ακυρωμένη",
  waitlisted: "Αναμονή", hosted: "Hosted",
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function fmtEur(n: number | null | undefined) {
  if (n == null) return "—"
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n)
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="space-y-0.5 min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground break-words">{value}</dd>
    </div>
  )
}

type Props = {
  booking: Booking | null
  onClose: () => void
}

export default function BillingDetailsModal({ booking, onClose }: Props) {
  const isReceipt = booking?.billing_type === "receipt"
  const isInvoice = booking?.billing_type === "invoice"
  const hasCompanion = !!booking?.companion

  return (
    <Dialog open={booking !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold pr-6">
            Λεπτομέρειες κράτησης
          </DialogTitle>
        </DialogHeader>

        {booking && (
          <div className="space-y-5 pt-1">

            {/* ── Booking summary ──────────────────────────────────── */}
            <section className="space-y-2">
              <SectionTitle>Κράτηση</SectionTitle>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Επισκέπτης" value={booking.full_name} />
                <div className="space-y-0.5">
                  <dt className="text-xs font-medium text-muted-foreground">Κατάσταση</dt>
                  <dd>
                    <Badge variant="outline" className={`text-xs ${STATUS_CFG[booking.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                      {STATUS_LABELS[booking.status] ?? booking.status}
                    </Badge>
                  </dd>
                </div>
                <Field label="Ξενοδοχείο" value={booking.hotel} />
                <Field label="Τύπος δωματίου" value={booking.room_type} />
                <div className="space-y-0.5">
                  <dt className="text-xs font-medium text-muted-foreground">Check-in</dt>
                  <dd className="text-sm text-foreground">{fmtDate(booking.checkin)}</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-xs font-medium text-muted-foreground">Check-out</dt>
                  <dd className="text-sm text-foreground">{fmtDate(booking.checkout)}</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-xs font-medium text-muted-foreground">Ποσό</dt>
                  <dd className="text-sm font-semibold text-foreground tabular-nums">{fmtEur(booking.amount)}</dd>
                </div>
                {booking.guests != null && (
                  <div className="space-y-0.5">
                    <dt className="text-xs font-medium text-muted-foreground">Επισκέπτες</dt>
                    <dd className="text-sm text-foreground">{booking.guests}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* ── Companion ───────────────────────────────────────── */}
            {hasCompanion && (
              <>
                <Separator />
                <section className="space-y-2">
                  <SectionTitle>Συνοδός</SectionTitle>
                  <p className="text-sm text-foreground bg-muted/50 rounded-md px-3 py-2">{booking.companion}</p>
                </section>
              </>
            )}

            {/* ── Billing ─────────────────────────────────────────── */}
            <Separator />
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <SectionTitle>Τιμολόγηση</SectionTitle>
                {booking.billing_type && (
                  <Badge variant="outline" className={isInvoice
                    ? "text-xs bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700"
                    : "text-xs bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700"
                  }>
                    {BILLING_LABELS[booking.billing_type] ?? booking.billing_type}
                  </Badge>
                )}
              </div>

              {!booking.billing_type && (
                <p className="text-sm text-muted-foreground italic">
                  Δεν έχουν συμπληρωθεί στοιχεία τιμολόγησης.
                </p>
              )}

              {isReceipt && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="ΑΦΜ" value={booking.receipt_vat} />
                  <Field label="ΔΟΥ" value={booking.receipt_tax_office} />
                </dl>
              )}

              {isInvoice && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Επωνυμία" value={booking.company_name} />
                  <Field label="ΑΦΜ" value={booking.vat} />
                  <Field label="ΔΟΥ" value={booking.tax_office} />
                  <Field label="Τηλέφωνο" value={booking.company_phone} />
                  <Field label="Email" value={booking.company_email} />
                  <Field label="Δραστηριότητα" value={booking.company_activity} />
                  <div className="sm:col-span-2">
                    <Field label="Διεύθυνση" value={booking.company_address} />
                  </div>
                </dl>
              )}
            </section>

          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
