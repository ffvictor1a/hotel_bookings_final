import { X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../lib/shadcn/dialog"
import { Badge } from "../../lib/shadcn/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../lib/shadcn/table"
import type { Booking, Change } from "../data/types"

// ── helpers ──────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  paid:      { label: "Πληρωμένη",   cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700" },
  confirmed: { label: "Επιβεβαιωμένη", cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-700" },
  pending:   { label: "Εκκρεμής",    cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-700" },
  cancelled:  { label: "Ακυρωμένη",  cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-700" },
  waitlisted: { label: "Λίστα Αναμονής", cls: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
}

function nightCount(checkin: string | null, checkout: string | null): number {
  if (!checkin || !checkout) return 0
  return Math.max(0, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86_400_000))
}

function calcAmount(b: Booking): number {
  return (b.price_per_night ?? 0) * nightCount(b.checkin, b.checkout)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function fmtDatetime(d: string) {
  return new Date(d).toLocaleString("el-GR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

function fmtEur(n: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n)
}

// ── sub-tables ────────────────────────────────────────────────────────────────
function BookingsTable({ rows }: { rows: Booking[] }) {
  if (rows.length === 0)
    return <p className="py-8 text-center text-sm text-muted-foreground">Δεν υπάρχουν εγγραφές.</p>

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {["#", "Επισκέπτης", "Ξενοδοχείο", "Δωμάτιο", "Check-in", "Check-out", "Ποσό", "Κατάσταση"].map((h) => (
            <TableHead key={h} className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4">
              {h}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((b) => {
          const sc = STATUS_CFG[b.status]
          return (
            <TableRow key={b.id} className="hover:bg-muted/40">
              <TableCell className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{b.id}</TableCell>
              <TableCell className="px-4 py-2.5 font-medium text-sm whitespace-nowrap">{b.full_name ?? "—"}</TableCell>
              <TableCell className="px-4 py-2.5 text-sm whitespace-nowrap text-muted-foreground">{b.hotel ?? "—"}</TableCell>
              <TableCell className="px-4 py-2.5 text-sm whitespace-nowrap text-muted-foreground">{b.room_type ?? "—"}</TableCell>
              <TableCell className="px-4 py-2.5 text-sm whitespace-nowrap text-muted-foreground">{b.checkin ? fmtDate(b.checkin) : "—"}</TableCell>
              <TableCell className="px-4 py-2.5 text-sm whitespace-nowrap text-muted-foreground">{b.checkout ? fmtDate(b.checkout) : "—"}</TableCell>
              <TableCell className="px-4 py-2.5 text-sm font-semibold tabular-nums whitespace-nowrap">{fmtEur(calcAmount(b))}</TableCell>
              <TableCell className="px-4 py-2.5">
                <Badge variant="outline" className={`text-xs ${sc.cls}`}>{sc.label}</Badge>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function ChangesTable({ rows }: { rows: Change[] }) {
  if (rows.length === 0)
    return <p className="py-8 text-center text-sm text-muted-foreground">Δεν υπάρχουν εγγραφές.</p>

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {["Αρ. Αλλαγής", "Επισκέπτης", "Ξενοδοχείο", "Χρήστης", "Ημ/νία", "Περιγραφή", "Παλιά Τιμή", "Νέα Τιμή", "Διαφορά €"].map((h) => (
            <TableHead key={h} className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4">
              {h}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id} className="hover:bg-muted/40">
            <TableCell className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{c.change_id}</TableCell>
            <TableCell className="px-4 py-2.5 font-medium text-sm whitespace-nowrap">{c.guest_name}</TableCell>
            <TableCell className="px-4 py-2.5 text-sm whitespace-nowrap text-muted-foreground">{c.hotel}</TableCell>
            <TableCell className="px-4 py-2.5 text-sm whitespace-nowrap text-muted-foreground">{c.changed_by}</TableCell>
            <TableCell className="px-4 py-2.5 text-sm whitespace-nowrap text-muted-foreground">{fmtDatetime(c.changed_at)}</TableCell>
            <TableCell className="px-4 py-2.5 text-sm text-muted-foreground">{c.change_description}</TableCell>
            <TableCell className="px-4 py-2.5 text-xs whitespace-nowrap text-muted-foreground">{c.old_value}</TableCell>
            <TableCell className="px-4 py-2.5 text-xs whitespace-nowrap text-muted-foreground">{c.new_value}</TableCell>
            <TableCell className={`px-4 py-2.5 text-sm font-semibold tabular-nums whitespace-nowrap ${
              c.amount_delta > 0 ? "text-emerald-600 dark:text-emerald-400"
              : c.amount_delta < 0 ? "text-red-600 dark:text-red-400"
              : "text-muted-foreground"
            }`}>
              {c.amount_delta > 0 ? "+" : ""}{fmtEur(c.amount_delta)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ── modal state type (exported so Dashboard can use it) ───────────────────────
export type ModalState =
  | { kind: "bookings"; title: string; rows: Booking[] }
  | { kind: "changes";  title: string; rows: Change[] }

// ── DataModal ─────────────────────────────────────────────────────────────────
type DataModalProps = {
  state: ModalState | null
  onClose: () => void
}

export default function DataModal({ state, onClose }: DataModalProps) {
  const count = state?.rows.length ?? 0

  return (
    <Dialog open={state !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-5xl w-full p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <DialogTitle className="text-base font-semibold truncate">{state?.title}</DialogTitle>
            <span className="shrink-0 text-xs font-medium bg-muted text-muted-foreground rounded-full px-2.5 py-0.5">
              {count} {count === 1 ? "εγγραφή" : "εγγραφές"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>
        <div className="overflow-auto max-h-[65vh]">
          {state?.kind === "bookings" && <BookingsTable rows={state.rows} />}
          {state?.kind === "changes"  && <ChangesTable  rows={state.rows} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
