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
  ChevronUp, ChevronDown, Search, AlertTriangle, Plus,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../lib/shadcn/card"
import { Badge } from "../lib/shadcn/badge"
import { Input } from "../lib/shadcn/input"
import { Button } from "../lib/shadcn/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../lib/shadcn/table"
import { Skeleton } from "../lib/shadcn/skeleton"

import { useGetBookings } from "../hooks/backend/bookings"
import { useGetAllotments } from "../hooks/backend/allotments"
import { useGetChanges } from "../hooks/backend/changes"

import AllotmentsSection from "./ui/AllotmentsSection"
import ReportsTab from "./ReportsTab"
import ChangesSection from "./ui/ChangesSection"
import DataModal, { type ModalState } from "./ui/DataModal"
import ManualBookingModal from "./ui/ManualBookingModal"

import type { Booking, Allotment, Change } from "./data/types"

// ── helpers ───────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  paid:      { label: "Πληρωμένη",   cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700" },
  confirmed: { label: "Επιβεβαιωμένη", cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-700" },
  pending:   { label: "Εκκρεμής",    cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-700" },
  cancelled:  { label: "Ακυρωμένη",  cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-700" },
  waitlisted: { label: "Λίστα Αναμονής", cls: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
  hosted:     { label: "Hosted",          cls: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-700" },
}

function nightCount(checkin: string | null, checkout: string | null): number {
  if (!checkin || !checkout) return 0
  return Math.max(0, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86_400_000))
}

function calcAmount(b: Booking): number {
  return (b.price_per_night ?? 0) * nightCount(b.checkin, b.checkout)
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
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {loading
                ? <Skeleton className="h-8 w-24" />
                : <p className="text-3xl font-bold text-foreground">{value}</p>
              }
            </div>
            <div className={`p-3 rounded-xl ${iconBg} transition-transform duration-150 group-hover:scale-110`}>
              {icon}
            </div>
          </div>
          {!loading && (
            <p className="mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
              Προβολή λεπτομερειών →
            </p>
          )}
        </CardContent>
      </Card>
    </button>
  )
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
type BarChartProps = {
  data: Booking[]
  loading: boolean
  onHotelClick: (hotel: string) => void
}

function BookingsBarChart({ data, loading, onHotelClick }: BarChartProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {}
    data.forEach((b) => {
      if (!b.hotel) return
      counts[b.hotel] = (counts[b.hotel] ?? 0) + 1
    })
    return Object.entries(counts)
      .map(([hotel, bookings]) => ({ hotel, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
  }, [data])

  const tickFormatter = (v: string) => v.length > 18 ? v.slice(0, 16) + "…" : v

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Κρατήσεις ανά Ξενοδοχείο</CardTitle>
        <p className="text-xs text-muted-foreground">Κάντε κλικ σε μια μπάρα για να δείτε τις κρατήσεις</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2 pt-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={290}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="hotel" width={142}
                tickFormatter={tickFormatter}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
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
              <Bar
                dataKey="bookings"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(entry) => onHotelClick((entry as unknown as { hotel: string }).hotel)}
                onMouseEnter={(entry) => setHovered((entry as unknown as { hotel: string }).hotel)}
                onMouseLeave={() => setHovered(null)}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.hotel}
                    fill={hovered === entry.hotel
                      ? "hsl(var(--chart-1) / 0.7)"
                      : "hsl(var(--chart-1))"}
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
function BookingsTable({ data, loading }: { data: Booking[]; loading: boolean }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const columns = useMemo<ColumnDef<Booking>[]>(() => [
    {
      accessorKey: "full_name",
      header: "Επισκέπτης",
      cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue<string | null>() ?? "—"}</span>,
    },
    {
      accessorKey: "hotel",
      header: "Ξενοδοχείο",
      cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue<string | null>() ?? "—"}</span>,
    },
    {
      accessorKey: "room_type",
      header: "Τύπος Δωματίου",
      cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue<string>()}</span>,
    },
    {
      accessorKey: "checkin",
      header: "Check-in",
      cell: ({ getValue }) => { const v = getValue<string | null>(); return <span className="whitespace-nowrap">{v ? fmtDate(v) : "—"}</span> },
    },
    {
      accessorKey: "checkout",
      header: "Check-out",
      cell: ({ getValue }) => { const v = getValue<string | null>(); return <span className="whitespace-nowrap">{v ? fmtDate(v) : "—"}</span> },
    },
    {
      id: "amount",
      header: "Ποσό",
      accessorFn: (row) => calcAmount(row),
      cell: ({ getValue }) => <span className="font-semibold tabular-nums whitespace-nowrap">{fmtEur(getValue<number>())}</span>,
    },
    {
      accessorKey: "status",
      header: "Κατάσταση",
      cell: ({ getValue }) => {
        const s = getValue<string>()
        const c = STATUS_CFG[s as keyof typeof STATUS_CFG] ?? { label: s ?? "—", cls: "bg-muted text-muted-foreground border-border" }
        return <Badge variant="outline" className={`text-xs font-medium ${c.cls}`}>{c.label}</Badge>
      },
    },
  ], [])

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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">Όλες οι Κρατήσεις</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Αναζήτηση..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {loading ? (
          <div className="space-y-2 px-6 pb-6">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id} className="hover:bg-transparent border-b border-border">
                      {hg.headers.map((h) => (
                        <TableHead
                          key={h.id}
                          className="px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap cursor-pointer select-none"
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
                          <TableCell key={cell.id} className="px-6 py-3 text-sm text-muted-foreground">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {table.getFilteredRowModel().rows.length} κρατήσεις
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                  Προηγ.
                </Button>
                <span className="text-sm text-muted-foreground">
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
  )
}

// ── Dashboard (main) ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: bData, loading: bLoading, error: bError, trigger: bTrigger } = useGetBookings()
  const { data: aData, loading: aLoading, trigger: aTrigger } = useGetAllotments()
  const { data: cData, loading: cLoading, error: cError, trigger: cTrigger } = useGetChanges()

  useEffect(() => { bTrigger() }, [])
  useEffect(() => { aTrigger() }, [])
  useEffect(() => { cTrigger() }, [])

  const bookings   = (bData as Booking[]   | undefined) ?? []
  const allotments = (aData as Allotment[] | undefined) ?? []
  const changes    = (cData as Change[]    | undefined) ?? []

  // ── KPI derivations ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const paid      = bookings.filter((b) => b.status === "paid")
    const confirmed = bookings.filter((b) => b.status === "confirmed")
    const pending   = bookings.filter((b) => b.status === "pending")
    const cancelled = bookings.filter((b) => b.status === "cancelled")
    const nonWaitlisted = bookings.filter((b) => b.status !== "waitlisted")
    const revenue   = [...paid, ...confirmed].reduce((s, b) => s + calcAmount(b), 0)
    const pendingChanges = changes.filter(
      (c) => c.requires_payment === "yes" || c.requires_refund === "yes"
    )
    return {
      total: nonWaitlisted.length,
      nonWaitlisted,
      revenue,
      paid,
      confirmed,
      pending,
      cancelled,
      pendingChanges,
    }
  }, [bookings, changes])

  // ── Modal state ──────────────────────────────────────────────────────────
  const [modal, setModal] = useState<ModalState | null>(null)
  const [manualBookingOpen, setManualBookingOpen] = useState(false)

  function openBookingModal(title: string, rows: Booking[]) {
    setModal({ kind: "bookings", title, rows })
  }

  function openChangesModal(title: string, rows: Change[]) {
    setModal({ kind: "changes", title, rows })
  }

  const anyError = bError || cError

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Hotel className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground leading-tight">Hotel Bookings</h1>
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
          <Button onClick={() => setManualBookingOpen(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            Χειροκίνητη Κράτηση
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {anyError && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
            Σφάλμα φόρτωσης δεδομένων: {anyError}
          </div>
        )}

        {/* ── KPI Cards ───────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            title="Σύνολο Κρατήσεων"
            value={kpis.total}
            icon={<Hotel className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            loading={bLoading}
            onClick={() => openBookingModal("Σύνολο Κρατήσεων", kpis.nonWaitlisted)}
          />
          <KpiCard
            title="Συνολικά Έσοδα"
            value={bLoading ? "—" : fmtEur(kpis.revenue)}
            icon={<BadgeDollarSign className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
            iconBg="bg-violet-100 dark:bg-violet-900/30"
            loading={bLoading}
            onClick={() => openBookingModal("Πληρωμένες & Επιβεβαιωμένες (Έσοδα)", [...kpis.paid, ...kpis.confirmed])}
          />
          <KpiCard
            title="Πληρωμένες"
            value={kpis.paid.length}
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            loading={bLoading}
            onClick={() => openBookingModal("Πληρωμένες κρατήσεις", kpis.paid)}
          />
          <KpiCard
            title="Εκκρεμείς"
            value={kpis.pending.length}
            icon={<Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            loading={bLoading}
            onClick={() => openBookingModal("Εκκρεμείς κρατήσεις", kpis.pending)}
          />
          <KpiCard
            title="Ακυρωμένες"
            value={kpis.cancelled.length}
            icon={<XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
            iconBg="bg-red-100 dark:bg-red-900/30"
            loading={bLoading}
            onClick={() => openBookingModal("Ακυρωμένες κρατήσεις", kpis.cancelled)}
          />
          <KpiCard
            title="Pending Αλλαγές"
            value={kpis.pendingChanges.length}
            icon={<AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            loading={cLoading}
            onClick={() => openChangesModal("Αλλαγές που απαιτούν ενέργεια", kpis.pendingChanges)}
          />
        </section>

        {/* ── Bar Chart ────────────────────────────────────────────────── */}
        <BookingsBarChart
          data={bookings}
          loading={bLoading}
          onHotelClick={(hotel) =>
            openBookingModal(
              `Κρατήσεις — ${hotel}`,
              bookings.filter((b) => b.hotel === hotel)
            )
          }
        />

        {/* ── Allotments ───────────────────────────────────────────────── */}
        <AllotmentsSection allotments={allotments} loading={aLoading} />

        {/* ── Changes ─────────────────────────────────────────────────── */}
        <ChangesSection
          changes={changes}
          loading={cLoading}
          onHeaderClick={() => openChangesModal("Λίστα Αλλαγών", changes)}
        />

        {/* ── All Bookings Table ───────────────────────────────────────── */}
        <BookingsTable data={bookings} loading={bLoading} />

        {/* ── Reports Tabs ─────────────────────────────────────────────── */}
        <ReportsTab />
      </main>

      {/* ── Detail Modal ─────────────────────────────────────────────── */}
      <DataModal state={modal} onClose={() => setModal(null)} />

      {/* ── Manual Booking Modal ─────────────────────────────────────── */}
      <ManualBookingModal
        open={manualBookingOpen}
        onClose={() => setManualBookingOpen(false)}
        onSuccess={() => { bTrigger({ skipCache: true }); aTrigger({ skipCache: true }) }}
      />
    </div>
  )
}
