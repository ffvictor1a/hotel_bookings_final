import { useEffect, useMemo, useState } from "react"
import {
  ColumnDef, flexRender, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel, SortingState, useReactTable,
} from "@tanstack/react-table"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import {
  Hotel, BadgeDollarSign, CheckCircle2, Clock, XCircle,
  ChevronUp, ChevronDown, Search, AlertTriangle, Plus, Ban, Pencil, Eye, Building2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../lib/shadcn/card"
import { Badge } from "../lib/shadcn/badge"
import { Input } from "../lib/shadcn/input"
import { Button } from "../lib/shadcn/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../lib/shadcn/table"
import { Skeleton } from "../lib/shadcn/skeleton"

import { useGetBookings, useCancelBooking } from "../hooks/backend/bookings"
import { useGetAvailability } from "../hooks/backend/allotments"
import { useGetChanges } from "../hooks/backend/changes"

import AllotmentsSection from "./ui/AllotmentsSection"
import ReportsTab from "./ReportsTab"
import ChangesSection from "./ui/ChangesSection"
import DataModal, { type ModalState } from "./ui/DataModal"
import ManualBookingModal from "./ui/ManualBookingModal"
import ChangeBookingModal from "./ui/ChangeBookingModal"
import BillingDetailsModal from "./ui/BillingDetailsModal"
import AddHotelModal from "./ui/AddHotelModal"

import type { Booking, AvailabilityRow, Change } from "./data/types"

// ── Column meta type ──────────────────────────────────────────────────────────
type ColMeta = { className?: string }

// ── helpers ───────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  paid:       { label: "Πληρωμένη",  cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700" },
  pending:    { label: "Εκκρεμής",   cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-700" },
  cancelled:  { label: "Ακυρωμένη", cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-700" },
  waitlisted: { label: "Αναμονή",    cls: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
  hosted:     { label: "Hosted",     cls: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-700" },
}

function fmtEur(n: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ── Clickable KPI Card ────────────────────────────────────────────────────────
type KpiCardProps = {
  title: string
  value: string | number
  icon: React.ReactNode
  iconBg: string
  loading: boolean
  onClick: () => void
}

function KpiCard({ title, value, icon, iconBg, loading, onClick }: KpiCardProps) {
  return (
    <button
      className="text-left w-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      onClick={onClick}
    >
      <Card className="transition-all duration-150 group-hover:shadow-md group-hover:border-primary/30 cursor-pointer">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
              {loading
                ? <Skeleton className="h-8 w-24" />
                : <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">{value}</p>
              }
            </div>
            <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${iconBg} transition-transform duration-150 group-hover:scale-110`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  )
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function BookingsBarChart({ data, loading, onHotelClick }: {
  data: Booking[]
  loading: boolean
  onHotelClick: (hotel: string) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {}
    data.forEach((b) => {
      if (!b.hotel) return
      const key = b.hotel.trim()
      counts[key] = (counts[key] ?? 0) + 1
    })
    return Object.entries(counts)
      .map(([hotel, bookings]) => ({ hotel, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
  }, [data])

  const tickFormatter = (v: string) => v.length > 16 ? v.slice(0, 14) + "…" : v

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Κρατήσεις ανά Ξενοδοχείο</CardTitle>
        <p className="text-xs text-muted-foreground">Κάντε κλικ σε μια μπάρα για να δείτε τις κρατήσεις</p>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {loading ? (
          <div className="space-y-2 pt-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="hotel" width={110}
                tickFormatter={tickFormatter}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--card-foreground))",
                  fontSize: 13,
                }}
                formatter={(value) => [value, "Κρατήσεις"]}
              />
              <Bar dataKey="bookings" radius={[0, 4, 4, 0]} cursor="pointer"
                onClick={(entry) => onHotelClick((entry as unknown as { hotel: string }).hotel)}
                onMouseEnter={(entry) => setHovered((entry as unknown as { hotel: string }).hotel)}
                onMouseLeave={() => setHovered(null)}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.hotel}
                    fill={hovered === entry.hotel ? "hsl(var(--chart-1) / 0.7)" : "hsl(var(--chart-1))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── Bookings Table ────────────────────────────────────────────────────────────
function BookingsTable({ data, loading, onCancelSuccess, onEditBooking }: {
  data: Booking[]
  loading: boolean
  onCancelSuccess: () => void
  onEditBooking: (booking: Booking) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [billingBooking, setBillingBooking] = useState<Booking | null>(null)
  const { trigger: cancelBooking } = useCancelBooking()

  const columns = useMemo<ColumnDef<Booking>[]>(() => [
    {
      accessorKey: "full_name",
      header: "Επισκέπτης",
      cell: ({ getValue }) => (
        <span className="font-medium text-foreground block w-full min-w-0 truncate">
          {getValue<string | null>() ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "hotel",
      header: "Ξενοδοχείο",
      meta: { className: "hidden sm:table-cell" } satisfies ColMeta,
      cell: ({ getValue }) => (
        <span className="block w-full min-w-0 truncate text-muted-foreground">
          {getValue<string | null>() ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "room_type",
      header: "Δωμάτιο",
      meta: { className: "hidden lg:table-cell" } satisfies ColMeta,
      cell: ({ getValue }) => (
        <span className="block w-full min-w-0 truncate">
          {getValue<string | null>() ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "checkin",
      header: "Check-in",
      meta: { className: "hidden md:table-cell" } satisfies ColMeta,
      cell: ({ getValue }) => {
        const v = getValue<string | null>()
        return <span className="tabular-nums">{v ? fmtDate(v) : "—"}</span>
      },
    },
    {
      accessorKey: "checkout",
      header: "Check-out",
      meta: { className: "hidden lg:table-cell" } satisfies ColMeta,
      cell: ({ getValue }) => {
        const v = getValue<string | null>()
        return <span className="tabular-nums">{v ? fmtDate(v) : "—"}</span>
      },
    },
    {
      accessorKey: "amount",
      header: "Ποσό",
      meta: { className: "hidden sm:table-cell" } satisfies ColMeta,
      cell: ({ getValue }) => (
        <span className="font-semibold tabular-nums">
          {fmtEur(getValue<number | null>() ?? 0)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Κατάσταση",
      cell: ({ getValue }) => {
        const s = getValue<string>()
        const c = STATUS_CFG[s as keyof typeof STATUS_CFG] ?? { label: s ?? "—", cls: "bg-muted text-muted-foreground border-border" }
        return (
          <Badge variant="outline" className={`text-xs font-medium ${c.cls}`}>
            {c.label}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const b = row.original

        if (confirmId === b.id) {
          return (
            <div className="flex items-center gap-1 flex-nowrap">
              <Button variant="destructive" size="sm" className="h-7 text-xs px-2 shrink-0"
                disabled={cancellingId === b.id}
                onClick={async () => {
                  setCancellingId(b.id)
                  setConfirmId(null)
                  try { await cancelBooking({ booking_id: b.id }); onCancelSuccess() }
                  finally { setCancellingId(null) }
                }}
              >
                {cancellingId === b.id ? "…" : "Ακύρωση"}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2 shrink-0"
                onClick={() => setConfirmId(null)}>
                Όχι
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="sm" aria-label="Λεπτομέρειες"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={() => setBillingBooking(b)}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" aria-label="Αλλαγή"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={() => onEditBooking(b)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            {b.status !== "cancelled" && (
              <Button variant="ghost" size="sm" aria-label="Ακύρωση"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmId(b.id)}>
                <Ban className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )
      },
    },
  ], [confirmId, cancellingId, cancelBooking, onCancelSuccess, onEditBooking, setBillingBooking])

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <>
      <Card className="min-w-0 w-full">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold">Όλες οι Κρατήσεις</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Αναζήτηση..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 h-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-2 px-4 sm:px-6 pb-6">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <>
              {/* [&>div]:!overflow-x-hidden targets shadcn's inner overflow-auto wrapper */}
              <div className="[&>div]:!overflow-x-hidden min-w-0">
                <Table className="table-fixed w-full">
                  <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id} className="hover:bg-transparent border-b border-border">
                        {hg.headers.map((h) => (
                          <TableHead key={h.id}
                            className={`px-2 sm:px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none ${(h.column.columnDef.meta as ColMeta | undefined)?.className ?? ""}`}
                            onClick={h.column.getToggleSortingHandler()}
                          >
                            <div className="flex items-center gap-1">
                              {flexRender(h.column.columnDef.header, h.getContext())}
                              {h.column.getIsSorted() === "asc"  && <ChevronUp className="w-3 h-3" />}
                              {h.column.getIsSorted() === "desc" && <ChevronDown className="w-3 h-3" />}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                          Δεν βρέθηκαν κρατήσεις.
                        </TableCell>
                      </TableRow>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} className="hover:bg-muted/50 transition-colors">
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}
                              className={`px-2 sm:px-4 py-3 text-sm text-muted-foreground overflow-hidden ${(cell.column.columnDef.meta as ColMeta | undefined)?.className ?? ""}`}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  {table.getFilteredRowModel().rows.length} κρατήσεις
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                    Προηγ.
                  </Button>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    Σελ. {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                    Επόμ.
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <BillingDetailsModal booking={billingBooking} onClose={() => setBillingBooking(null)} />
    </>
  )
}

// ── Dashboard (main) ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: bData, loading: bLoading, error: bError, trigger: bTrigger } = useGetBookings()
  const { data: aData, loading: aLoading, trigger: aTrigger } = useGetAvailability()
  const { data: cData, loading: cLoading, error: cError, trigger: cTrigger } = useGetChanges()

  useEffect(() => { bTrigger() }, [])
  useEffect(() => { aTrigger() }, [])
  useEffect(() => { cTrigger() }, [])

  const bookings     = (bData as Booking[]         | undefined) ?? []
  const availability = (aData as AvailabilityRow[] | undefined) ?? []
  const changes      = (cData as Change[]          | undefined) ?? []

  const kpis = useMemo(() => {
    const paid      = bookings.filter((b) => b.status === "paid")
    const pending   = bookings.filter((b) => b.status === "pending")
    const cancelled = bookings.filter((b) => b.status === "cancelled")
    const nonWaitlisted = bookings.filter((b) => b.status !== "waitlisted")
    const revenue = paid.reduce((s, b) => s + (b.amount ?? 0), 0)
    const pendingChanges = changes.filter(
      (c) => c.requires_payment === "yes" || c.requires_refund === "yes"
    )
    return { total: nonWaitlisted.length, nonWaitlisted, revenue, paid, pending, cancelled, pendingChanges }
  }, [bookings, changes])

  const sortedBookings = useMemo(
    () => [...bookings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [bookings]
  )

  const [modal, setModal] = useState<ModalState | null>(null)
  const [manualBookingOpen, setManualBookingOpen] = useState(false)
  const [addHotelOpen, setAddHotelOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)

  // Derive hotel names from availability — auto-updates when aTrigger(skipCache) is called
  const hotelNames = useMemo(
    () => [...new Set(availability.map((r) => r.hotel))].sort(),
    [availability]
  )

  function openBookingModal(title: string, rows: Booking[]) { setModal({ kind: "bookings", title, rows }) }
  function openChangesModal(title: string, rows: Change[])  { setModal({ kind: "changes",  title, rows }) }

  function refreshAll() {
    bTrigger(undefined, { skipCache: true })
    cTrigger(undefined, { skipCache: true })
    aTrigger(undefined, { skipCache: true })
  }

  const anyError = bError || cError

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Hotel className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">Hotel Bookings</h1>
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => setAddHotelOpen(true)} className="gap-1.5 text-sm">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">+ Προσθήκη Ξενοδοχείου</span>
              <span className="sm:hidden">+Ξεν.</span>
            </Button>
            <Button onClick={() => setManualBookingOpen(true)} className="gap-1.5 text-sm">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Χειροκίνητη </span>Κράτηση
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {anyError && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
            Σφάλμα φόρτωσης δεδομένων: {anyError}
          </div>
        )}

        {/* ── KPI Cards — 2 cols mobile, 3 cols sm+ ─────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard title="Σύνολο Κρατήσεων" value={kpis.total}
            icon={<Hotel className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />}
            iconBg="bg-blue-100 dark:bg-blue-900/30" loading={bLoading}
            onClick={() => openBookingModal("Σύνολο Κρατήσεων", kpis.nonWaitlisted)} />
          <KpiCard title="Συνολικά Έσοδα" value={bLoading ? "—" : fmtEur(kpis.revenue)}
            icon={<BadgeDollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 dark:text-violet-400" />}
            iconBg="bg-violet-100 dark:bg-violet-900/30" loading={bLoading}
            onClick={() => openBookingModal("Πληρωμένες (Έσοδα)", kpis.paid)} />
          <KpiCard title="Πληρωμένες" value={kpis.paid.length}
            icon={<CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30" loading={bLoading}
            onClick={() => openBookingModal("Πληρωμένες κρατήσεις", kpis.paid)} />
          <KpiCard title="Εκκρεμείς" value={kpis.pending.length}
            icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />}
            iconBg="bg-amber-100 dark:bg-amber-900/30" loading={bLoading}
            onClick={() => openBookingModal("Εκκρεμείς κρατήσεις", kpis.pending)} />
          <KpiCard title="Ακυρωμένες" value={kpis.cancelled.length}
            icon={<XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />}
            iconBg="bg-red-100 dark:bg-red-900/30" loading={bLoading}
            onClick={() => openBookingModal("Ακυρωμένες κρατήσεις", kpis.cancelled)} />
          <KpiCard title="Pending Αλλαγές" value={kpis.pendingChanges.length}
            icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />}
            iconBg="bg-orange-100 dark:bg-orange-900/30" loading={cLoading}
            onClick={() => openChangesModal("Αλλαγές που απαιτούν ενέργεια", kpis.pendingChanges)} />
        </section>

        {/* ── Bar Chart ───────────────────────────────────────────────── */}
        <BookingsBarChart data={bookings} loading={bLoading}
          onHotelClick={(hotel) =>
            openBookingModal(`Κρατήσεις — ${hotel}`, bookings.filter((b) => b.hotel?.trim() === hotel))}
        />

        {/* ── Allotments ──────────────────────────────────────────────── */}
        <AllotmentsSection rows={availability} loading={aLoading} />

        {/* ── Changes ─────────────────────────────────────────────────── */}
        <ChangesSection changes={changes} loading={cLoading}
          onHeaderClick={() => openChangesModal("Λίστα Αλλαγών", changes)} />

        {/* ── All Bookings Table ───────────────────────────────────────── */}
        <BookingsTable data={sortedBookings} loading={bLoading}
          onCancelSuccess={refreshAll}
          onEditBooking={(b) => setEditingBooking(b)} />

        {/* ── Reports Tabs ─────────────────────────────────────────────── */}
        <ReportsTab hotelNames={hotelNames} />

      </main>

      <DataModal state={modal} onClose={() => setModal(null)} />
      <ManualBookingModal open={manualBookingOpen} onClose={() => setManualBookingOpen(false)} onSuccess={refreshAll} hotelNames={hotelNames} />
      <AddHotelModal open={addHotelOpen} onClose={() => setAddHotelOpen(false)} onSuccess={refreshAll} />
      <ChangeBookingModal open={editingBooking !== null} booking={editingBooking}
        onClose={() => setEditingBooking(null)} onSuccess={refreshAll} />
    </div>
  )
}
