import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ColumnDef, flexRender, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel, SortingState, useReactTable,
} from "@tanstack/react-table"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts"
import {
  Hotel, BadgeDollarSign, CheckCircle2, Clock, XCircle,
  ChevronUp, ChevronDown, Search, AlertTriangle, Plus, Ban, Pencil, Eye, Building2,
  ExternalLink,
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

import { LanguageProvider, useLanguage } from "../utils/LanguageContext"
import type { Booking, AvailabilityRow, Change } from "./data/types"

// ── Booking form URL (update this to the real URL) ────────────────────────────
const BOOKING_FORM_URL = "https://ffvictor1a.github.io/hotel_bookings_final/"

// ── Column meta type ──────────────────────────────────────────────────────────
type ColMeta = { className?: string }

// ── Status style map ──────────────────────────────────────────────────────────
const STATUS_STYLE = {
  paid:       "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
  pending:    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-700",
  cancelled:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-700",
  waitlisted: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  hosted:     "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-700",
}

function fmtEur(n: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ── Translated status badge ───────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage()
  const cls = STATUS_STYLE[status as keyof typeof STATUS_STYLE] ?? "bg-muted text-muted-foreground border-border"
  const label =
    status === "paid"       ? t.statusPaid
    : status === "pending"    ? t.statusPending
    : status === "cancelled"  ? t.statusCancelled
    : status === "waitlisted" ? t.statusWaitlisted
    : status === "hosted"     ? t.statusHosted
    : status ?? "—"
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cls}`}>
      {label}
    </Badge>
  )
}

// ── Clickable KPI Card ────────────────────────────────────────────────────────
type KpiCardProps = {
  title: string
  value: string | number
  icon: ReactNode
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

// ── Bar Chart: Κρατήσεις ανά Ξενοδοχείο (με data labels) ─────────────────────
function BookingsBarChart({ data, loading, onHotelClick }: {
  data: Booking[]
  loading: boolean
  onHotelClick: (hotel: string) => void
}) {
  const { t } = useLanguage()
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

  const total = useMemo(() => chartData.reduce((s, d) => s + d.bookings, 0), [chartData])
  const tickFormatter = (v: string) => v.length > 16 ? v.slice(0, 14) + "…" : v

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{t.bookingsByHotel}</CardTitle>
        <p className="text-xs text-muted-foreground">{t.barChartSubtitle}</p>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {loading ? (
          <div className="space-y-2 pt-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 38 + 40)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 110, left: 4, bottom: 4 }}>
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
                formatter={(value) => [value, t.bookingsTooltip]}
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
                <LabelList
                  dataKey="bookings"
                  position="right"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  content={(props: any) => {
                    const nx = Number(props?.x ?? 0)
                    const ny = Number(props?.y ?? 0)
                    const nw = Number(props?.width ?? 0)
                    const nh = Number(props?.height ?? 0)
                    const nv = Number(props?.value ?? 0)
                    const pct = total > 0 ? ((nv / total) * 100).toFixed(1) : "0.0"
                    return (
                      <text
                        x={nx + nw + 7}
                        y={ny + nh / 2}
                        fill="hsl(var(--foreground))"
                        fontSize={11}
                        dominantBaseline="middle"
                        fontFamily="inherit"
                      >
                        {`${nv} (${pct}%)`}
                      </text>
                    )
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── Stacked Bar Chart: Κρατήσεις ανά Τύπο Δωματίου, ανά Ξενοδοχείο ──────────
const RT_COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ef4444", // red-500
]

function RoomTypeBarChart({ data, loading }: { data: Booking[]; loading: boolean }) {
  const { t } = useLanguage()
  const { chartData, roomTypes } = useMemo(() => {
    const hotelMap: Record<string, Record<string, number>> = {}
    const rtSet = new Set<string>()

    data.forEach((b) => {
      if (b.status === "waitlisted" || !b.hotel || !b.room_type) return
      const hotel = b.hotel.trim()
      const rt = b.room_type.trim()
      rtSet.add(rt)
      if (!hotelMap[hotel]) hotelMap[hotel] = {}
      hotelMap[hotel][rt] = (hotelMap[hotel][rt] ?? 0) + 1
    })

    const roomTypes = [...rtSet].sort()
    const chartData = Object.entries(hotelMap)
      .map(([hotel, counts]) => {
        const row: Record<string, number | string> = { hotel }
        roomTypes.forEach((rt) => { row[rt] = counts[rt] ?? 0 })
        return row
      })
      .sort((a, b) => {
        const sumA = roomTypes.reduce((s, rt) => s + Number(a[rt] ?? 0), 0)
        const sumB = roomTypes.reduce((s, rt) => s + Number(b[rt] ?? 0), 0)
        return sumB - sumA
      })

    return { chartData, roomTypes }
  }, [data])

  const tickFormatter = (v: string) => v.length > 14 ? v.slice(0, 12) + "…" : v

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{t.bookingsByRoomTypeTitle}</CardTitle>
        <p className="text-xs text-muted-foreground">{t.bookingsByRoomTypeSub}</p>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {loading ? (
          <div className="space-y-2 pt-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t.noChartData}</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 44 + 60)}>
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
                />
                {roomTypes.map((rt, idx) => (
                  <Bar
                    key={rt}
                    dataKey={rt}
                    stackId="a"
                    fill={RT_COLORS[idx % RT_COLORS.length]}
                    radius={idx === roomTypes.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                  >
                    <LabelList
                      dataKey={rt}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      content={(props: any) => {
                        const nx = Number(props?.x ?? 0)
                        const ny = Number(props?.y ?? 0)
                        const nw = Number(props?.width ?? 0)
                        const nh = Number(props?.height ?? 0)
                        const nv = Number(props?.value ?? 0)
                        if (nv === 0 || nw < 22) return null
                        return (
                          <text
                            x={nx + nw / 2}
                            y={ny + nh / 2}
                            fill="white"
                            fontSize={10}
                            fontWeight={600}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            {nv}
                          </text>
                        )
                      }}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              {roomTypes.map((rt, idx) => (
                <div key={rt} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ background: RT_COLORS[idx % RT_COLORS.length] }}
                  />
                  {rt}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── General Stats ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-muted/40 rounded-lg p-3 sm:p-4 border border-border">
      <p className="text-xs text-muted-foreground mb-1 leading-snug">{label}</p>
      <p className="text-base sm:text-lg font-bold text-foreground leading-tight break-words">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function GeneralStats({ bookings, loading }: { bookings: Booking[]; loading: boolean }) {
  const { t } = useLanguage()
  const stats = useMemo(() => {
    const total = bookings.length
    if (total === 0) return null

    const paidConfirmed = bookings.filter((b) => b.status === "paid" || b.status === "hosted")
    const cancelled     = bookings.filter((b) => b.status === "cancelled")
    const waitlisted    = bookings.filter((b) => b.status === "waitlisted")

    const avgAmount =
      paidConfirmed.length > 0
        ? paidConfirmed.reduce((s, b) => s + (b.amount ?? 0), 0) / paidConfirmed.length
        : 0

    const withDates = bookings.filter((b) => b.checkin && b.checkout)
    const avgNights =
      withDates.length > 0
        ? withDates.reduce((s, b) => {
            const nights =
              (new Date(b.checkout ?? "").getTime() - new Date(b.checkin ?? "").getTime()) /
              86400000
            return s + nights
          }, 0) / withDates.length
        : 0

    const cancellationPct = (cancelled.length / total) * 100
    const waitlistPct     = (waitlisted.length / total) * 100

    const nonWL = bookings.filter((b) => b.status !== "waitlisted")

    const hotelCounts: Record<string, number> = {}
    nonWL.forEach((b) => {
      if (!b.hotel) return
      hotelCounts[b.hotel] = (hotelCounts[b.hotel] ?? 0) + 1
    })
    const sortedHotels = Object.entries(hotelCounts).sort(([, a], [, b]) => b - a)
    const topHotel = sortedHotels[0]?.[0] ?? "—"

    const rtCounts: Record<string, number> = {}
    nonWL.forEach((b) => {
      if (!b.room_type) return
      rtCounts[b.room_type] = (rtCounts[b.room_type] ?? 0) + 1
    })
    const sortedRt    = Object.entries(rtCounts).sort(([, a], [, b]) => b - a)
    const topRoomType = sortedRt[0]?.[0] ?? "—"

    return { avgAmount, avgNights, cancellationPct, waitlistPct, topHotel, topRoomType }
  }, [bookings])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{t.generalStats}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : !stats ? (
          <p className="text-sm text-muted-foreground">{t.noDataYet}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              label={t.avgAmountLabel}
              value={fmtEur(stats.avgAmount)}
              sub={t.avgAmountSub}
            />
            <StatCard
              label={t.avgNightsLabel}
              value={`${stats.avgNights.toFixed(1)} ${t.avgNightsUnit}`}
            />
            <StatCard
              label={t.cancellationRateLabel}
              value={`${stats.cancellationPct.toFixed(1)}%`}
              sub={t.perTotal}
            />
            <StatCard
              label={t.waitlistRateLabel}
              value={`${stats.waitlistPct.toFixed(1)}%`}
              sub={t.perTotal}
            />
            <StatCard
              label={t.topHotelLabel}
              value={stats.topHotel}
            />
            <StatCard
              label={t.topRoomTypeLabel}
              value={stats.topRoomType}
            />
          </div>
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
  const { t } = useLanguage()
  // Default: newest booking first
  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }])
  const [globalFilter, setGlobalFilter] = useState("")
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [billingBooking, setBillingBooking] = useState<Booking | null>(null)
  const { trigger: cancelBooking } = useCancelBooking()

  const columns = useMemo<ColumnDef<Booking>[]>(() => [
    {
      accessorKey: "full_name",
      header: t.guestName,
      cell: ({ getValue }) => (
        <span className="font-medium text-foreground block w-full min-w-0 truncate">
          {getValue<string | null>() ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "hotel",
      header: t.hotel,
      meta: { className: "hidden sm:table-cell" } satisfies ColMeta,
      cell: ({ getValue }) => (
        <span className="block w-full min-w-0 truncate text-muted-foreground">
          {getValue<string | null>() ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "room_type",
      header: t.roomType,
      meta: { className: "hidden lg:table-cell" } satisfies ColMeta,
      cell: ({ getValue }) => (
        <span className="block w-full min-w-0 truncate">
          {getValue<string | null>() ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "checkin",
      header: t.checkin,
      meta: { className: "hidden md:table-cell" } satisfies ColMeta,
      cell: ({ getValue }) => {
        const v = getValue<string | null>()
        return <span className="tabular-nums">{v ? fmtDate(v) : "—"}</span>
      },
    },
    {
      accessorKey: "checkout",
      header: t.checkout,
      meta: { className: "hidden lg:table-cell" } satisfies ColMeta,
      cell: ({ getValue }) => {
        const v = getValue<string | null>()
        return <span className="tabular-nums">{v ? fmtDate(v) : "—"}</span>
      },
    },
    {
      accessorKey: "amount",
      header: t.amount,
      meta: { className: "hidden sm:table-cell" } satisfies ColMeta,
      cell: ({ getValue }) => (
        <span className="font-semibold tabular-nums">
          {fmtEur(getValue<number | null>() ?? 0)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t.status,
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
    },
    {
      accessorKey: "created_at",
      header: "",
      cell: () => null,
      enableSorting: true,
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
                {cancellingId === b.id ? "…" : t.cancelConfirm}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2 shrink-0"
                onClick={() => setConfirmId(null)}>
                {t.noBtn}
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="sm" aria-label="details"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={() => setBillingBooking(b)}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" aria-label="edit"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={() => onEditBooking(b)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            {b.status !== "cancelled" && (
              <Button variant="ghost" size="sm" aria-label="cancel"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmId(b.id)}>
                <Ban className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )
      },
    },
  ], [t, confirmId, cancellingId, cancelBooking, onCancelSuccess, onEditBooking])

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting, globalFilter, columnVisibility: { created_at: false } },
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
            <CardTitle className="text-base font-semibold">{t.allBookings}</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t.searchPlaceholder}
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
                          {t.noBookingsFound}
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
                  {table.getFilteredRowModel().rows.length} {t.bookingsCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                    {t.prev}
                  </Button>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {t.page} {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                    {t.next}
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

// ── Dashboard inner (uses language context) ───────────────────────────────────
function DashboardContent() {
  const { t, lang, toggleLang } = useLanguage()

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
    <div className="flex flex-col h-screen bg-background">

      {/* ── Header — always visible; scroll happens in the div below ─── */}
      <header className="shrink-0 z-50 border-b border-border bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Hotel className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">Hotel Bookings</h1>
              <p className="text-xs text-muted-foreground">{t.adminDashboard}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* ── Booking Form link ── */}
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-sm">
              <a href={BOOKING_FORM_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.bookingFormBtn}</span>
              </a>
            </Button>
            {/* ── Language toggle ── */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLang}
              className="font-semibold text-xs px-3 min-w-[44px]"
              aria-label="Switch language"
            >
              {lang === "el" ? "EN" : "ΕΛ"}
            </Button>
            <Button variant="outline" onClick={() => setAddHotelOpen(true)} className="gap-1.5 text-sm">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t.addHotel}</span>
              <span className="sm:hidden">{t.addHotelShort}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {anyError && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
            {t.loadError} {anyError}
          </div>
        )}

        {/* ── KPI Cards — 2 cols mobile, 3 cols sm+ ─────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard title={t.totalBookings} value={kpis.total}
            icon={<Hotel className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />}
            iconBg="bg-blue-100 dark:bg-blue-900/30" loading={bLoading}
            onClick={() => openBookingModal(t.modalTotalBookings, kpis.nonWaitlisted)} />
          <KpiCard title={t.totalRevenue} value={bLoading ? "—" : fmtEur(kpis.revenue)}
            icon={<BadgeDollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 dark:text-violet-400" />}
            iconBg="bg-violet-100 dark:bg-violet-900/30" loading={bLoading}
            onClick={() => openBookingModal(t.modalPaidRevenue, kpis.paid)} />
          <KpiCard title={t.paid} value={kpis.paid.length}
            icon={<CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30" loading={bLoading}
            onClick={() => openBookingModal(t.modalPaidBookings, kpis.paid)} />
          <KpiCard title={t.pending} value={kpis.pending.length}
            icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />}
            iconBg="bg-amber-100 dark:bg-amber-900/30" loading={bLoading}
            onClick={() => openBookingModal(t.modalPendingBookings, kpis.pending)} />
          <KpiCard title={t.cancelled} value={kpis.cancelled.length}
            icon={<XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />}
            iconBg="bg-red-100 dark:bg-red-900/30" loading={bLoading}
            onClick={() => openBookingModal(t.modalCancelledBookings, kpis.cancelled)} />
          <KpiCard title={t.pendingChanges} value={kpis.pendingChanges.length}
            icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />}
            iconBg="bg-orange-100 dark:bg-orange-900/30" loading={cLoading}
            onClick={() => openChangesModal(t.modalChangesAction, kpis.pendingChanges)} />
        </section>

        {/* ── 1. Bar Chart: Κρατήσεις ανά Ξενοδοχείο ─────────────────── */}
        <BookingsBarChart data={bookings} loading={bLoading}
          onHotelClick={(hotel) =>
            openBookingModal(`${t.bookingsForHotel} — ${hotel}`, bookings.filter((b) => b.hotel?.trim() === hotel))}
        />

        {/* ── 2. Stacked Bar Chart: ανά Τύπο Δωματίου ────────────────── */}
        <RoomTypeBarChart data={bookings} loading={bLoading} />

        {/* ── 3. Γενικά Στατιστικά ────────────────────────────────────── */}
        <GeneralStats bookings={bookings} loading={bLoading} />

        {/* ── α. Πίνακας Κρατήσεων ────────────────────────────────────── */}
        <BookingsTable data={sortedBookings} loading={bLoading}
          onCancelSuccess={refreshAll}
          onEditBooking={(b) => setEditingBooking(b)} />

        {/* ── β. Αλλαγές (audit log) ───────────────────────────────────── */}
        <ChangesSection changes={changes} loading={cLoading}
          onHeaderClick={() => openChangesModal(t.changesLog, changes)} />

        {/* ── γ. Κουμπί Χειροκίνητης Κράτησης + δ. Διαθέσιμα Δωμάτια ─ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">{t.availableRoomsTitle}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t.availableRoomsSub}</p>
            </div>
            <Button onClick={() => setManualBookingOpen(true)} className="gap-1.5 text-sm shrink-0">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t.manualBooking}</span>
              <span className="sm:hidden">{t.manualBookingShort}</span>
            </Button>
          </div>
          <AllotmentsSection rows={availability} loading={aLoading} />
        </section>

        {/* ── Reports Tabs ─────────────────────────────────────────────── */}
        <ReportsTab hotelNames={hotelNames} />

      </main>
      </div>

      <DataModal state={modal} onClose={() => setModal(null)} />
      <ManualBookingModal open={manualBookingOpen} onClose={() => setManualBookingOpen(false)} onSuccess={refreshAll} hotelNames={hotelNames} />
      <AddHotelModal open={addHotelOpen} onClose={() => setAddHotelOpen(false)} onSuccess={refreshAll} />
      <ChangeBookingModal open={editingBooking !== null} booking={editingBooking}
        onClose={() => setEditingBooking(null)} onSuccess={refreshAll} />
    </div>
  )
}

// ── Dashboard (exported) — wraps with LanguageProvider ───────────────────────
export default function Dashboard() {
  return (
    <LanguageProvider>
      <DashboardContent />
    </LanguageProvider>
  )
}
