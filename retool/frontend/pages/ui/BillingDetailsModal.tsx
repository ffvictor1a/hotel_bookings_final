import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../lib/shadcn/dialog"
import { Badge } from "../../lib/shadcn/badge"
import { Separator } from "../../lib/shadcn/separator"
import type { Booking } from "../data/types"

const BILLING_LABELS: Record<string, string> = {
  receipt: "Απόδειξη",
  invoice: "Τιμολόγιο",
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
            Λεπτομέρειες — {booking?.full_name ?? "—"}
          </DialogTitle>
        </DialogHeader>

        {booking && (
          <div className="space-y-4 pt-1">

            {/* Companion */}
            {hasCompanion && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Συνοδός</h3>
                <p className="text-sm text-foreground bg-muted/50 rounded-md px-3 py-2">{booking.companion}</p>
              </section>
            )}

            {(hasCompanion && booking.billing_type) && <Separator />}

            {/* Billing */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Τιμολόγηση</h3>
                {booking.billing_type && (
                  <Badge
                    variant="outline"
                    className={isInvoice
                      ? "text-xs bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700"
                      : "text-xs bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700"
                    }
                  >
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
                  <Field label="Διεύθυνση" value={booking.company_address} />
                  <Field label="Email" value={booking.company_email} />
                  <Field label="Δραστηριότητα" value={booking.company_activity} />
                </dl>
              )}
            </section>

          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
