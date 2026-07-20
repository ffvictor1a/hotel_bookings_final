import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../lib/shadcn/dialog"
import { Badge } from "../../lib/shadcn/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../lib/shadcn/table"
import type { Booking, Change } from "../data/types"

// ── helpers ──────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  paid:       { label: "Πληρωμένη",        cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700" },
  pending:    { label: "Εκκρεμής",         cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-700" },
  cancelled:  { label: "Ακυρωμένη",        cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-700" },
  waitlisted: { label: "Λίστα Αναμονής",   cls: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
  hosted:     { label: "Hosted",           cls: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-700" },
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
    <div className="overflow-x-auto">
      <Table className="min-w-[600px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {["#", "Επισκέπτης", "Ξενοδοχείο", "Check-in", "Check-out", "Ποσό", "Κατάσταση"].map((h) => (
              <TableHead key={h} className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((b) => {
            const sc = STATUS_CFG[b.status] ?? { label: b.status ?? "—", cls: "bg-muted text-muted-foreground border-border" }
            return (
              <TableRow key={b.id} className="hover:bg-muted/40">
                <TableCell className="px-4 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{b.id}</TableCell>
                <TableCell className="px-4 py-2.5 font-medium text-sm">
                  <span className="block max-w-[140px] truncate">{b.full_name ?? "—"}</span>
                </TableCell>
                <TableCell className="px-4 py-2.5 text-sm text-muted-foreground">
                  <span className="block max-w-[140px] truncate">{b.hotel ?? "—"}</span>
                </TableCell>
                <TableCell className="px-4 py-2.5 text-sm whitespace-nowrap text-muted-foreground">{b.checkin ? fmtDate(b.checkin) : "—"}</TableCell>
                <TableCell className="px-4 py-2.5 text-sm whitespace-nowrap text-muted-foreground">{b.checkout ? fmtDate(b.checkout) : "—"}</TableCell>
                <TableCell className="px-4 py-2.5 text-sm font-semibold tabular-nums whitespace-nowrap">{fmtEur(b.amount ?? 0)}</TableCell>
                <TableCell className="px-4 py-2.5">
                  <Badge variant="outline" className={`text-xs ${sc.cls}`}>{sc.label}</Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function ChangesTable({ rows }: { rows: Change[] }) {
  if (rows.length === 0)
    return <p className="py-8 text-center text-sm text-muted-foreground">Δεν υπάρχουν εγγραφές.</p>

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[700px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {["Επισκέπτης", "Ξενοδοχείο", "Χρήστης", "Ημ/νία", "Περιγραφή", "Παλιά Τιμή", "Νέα Τιμή", "Διαφορά €"].map((h) => (
              <TableHead key={h} className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c.id} className="hover:bg-muted/40">
              <TableCell className="px-4 py-2.5 font-medium text-sm">
                <span className="block max-w-[120px] truncate">{c.guest_name}</span>
              </TableCell>
              <TableCell className="px-4 py-2.5 text-sm text-muted-foreground">
                <span className="block max-w-[130px] truncate">{c.hotel}</span>
              </TableCell>
              <TableCell className="px-4 py-2.5 text-sm whitespace-nowrap text-muted-foreground">{c.changed_by}</TableCell>
              <TableCell className="px-4 py-2.5 text-sm whitespace-nowrap text-muted-foreground">{fmtDatetime(c.changed_at)}</TableCell>
              <TableCell className="px-4 py-2.5 text-sm text-muted-foreground">
                <span className="block max-w-[160px] truncate">{c.change_description}</span>
              </TableCell>
              <TableCell className="px-4 py-2.5 text-xs text-muted-foreground">
                <span className="block max-w-[100px] truncate">{c.old_value}</span>
              </TableCell>
              <TableCell className="px-4 py-2.5 text-xs text-muted-foreground">
                <span className="block max-w-[100px] truncate">{c.new_value}</span>
              </TableCell>
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
    </div>
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
      <DialogContent className="max-w-5xl w-[95vw] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0 pr-8">
            <DialogTitle className="text-base font-semibold truncate">{state?.title}</DialogTitle>
            <span className="shrink-0 text-xs font-medium bg-muted text-muted-foreground rounded-full px-2.5 py-0.5">
              {count} {count === 1 ? "εγγραφή" : "εγγραφές"}
            </span>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[65vh]">
          {state?.kind === "bookings" && <BookingsTable rows={state.rows} />}
          {state?.kind === "changes"  && <ChangesTable  rows={state.rows} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
