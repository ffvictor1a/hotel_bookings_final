import { useEffect, useMemo, useState } from "react"
import {
  ColumnDef, flexRender, getCoreRowModel, getSortedRowModel,
  getPaginationRowModel, SortingState, useReactTable,
} from "@tanstack/react-table"
import { Download, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import * as XLSX from "xlsx"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../lib/shadcn/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../lib/shadcn/select"
import { Button } from "../lib/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "../lib/shadcn/card"
import { Skeleton } from "../lib/shadcn/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../lib/shadcn/table"
import { Badge } from "../lib/shadcn/badge"

import { useGetRoomingList } from "../hooks/backend/reports"
import { useGetFullReport } from "../hooks/backend/reports"
import { useGetPayments } from "../hooks/backend/reports"
import { useGetChangesReport } from "../hooks/backend/reports"
import { useLanguage } from "../utils/LanguageContext"

// ── Constants ─────────────────────────────────────────────────────────────────
const HOTELS = [
  "Ace Hotel & Swim Club Athens",
  "Glyfada Riviera Hotel",
  "Athens Coast Hotel",
  "Emmantina Hotel",
  "Congo Palace",
  "Seaview Cityscape Hotel",
  "Dusit Suites Athens",
  "Poseidon Grand Hotel",
]

const STATUS_STYLE: Record<string, string> = {
  paid:      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
  pending:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-700",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-700",
}

// ── Excel export ──────────────────────────────────────────────────────────────
function exportExcel(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Data")
  XLSX.writeFile(wb, filename.replace(/\.csv$/i, ".xlsx"))
}

// ── Status badge (translated) ─────────────────────────────────────────────────
function StatusBadge({ status }: { status: unknown }) {
  const { t } = useLanguage()
  const s = String(status ?? "").toLowerCase()
  const cls = STATUS_STYLE[s] ?? "bg-muted text-muted-foreground border-border"
  const label =
    s === "paid"      ? t.statusPaid
    : s === "pending"   ? t.statusPending
    : s === "cancelled" ? t.statusCancelled
    : s === "waitlisted"? t.statusWaitlisted
    : status == null    ? "—"
    : String(status)
  return <Badge variant="outline" className={`${cls} text-xs font-medium`}>{label}</Badge>
}

// ── Generic report table ──────────────────────────────────────────────────────
type ReportTableProps<T extends Record<string, unknown>> = {
  data: T[] | undefined
  loading: boolean
  error: string | null
  columns: ColumnDef<T>[]
  exportFilename: string
  emptyText?: string
  /** Allow horizontal scroll inside the table (for wide tables like Full Report) */
  scrollable?: boolean
}

function ReportTable<T extends Record<string, unknown>>({
  data, loading, error, columns, exportFilename, emptyText, scrollable = false,
}: ReportTableProps<T>) {
  const { t } = useLanguage()
  const [sorting, setSorting] = useState<SortingState>([])
  const rows = data ?? []
  const resolvedEmptyText = emptyText ?? t.noRecordsFound

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
        {t.errorPrefix} {error}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Export bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? t.loadingText : `${rows.length} ${t.records}`}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => exportExcel(rows as Record<string, unknown>[], exportFilename)}
          disabled={loading || rows.length === 0}
        >
          <Download className="w-4 h-4" />
          {t.exportCsv}
        </Button>
      </div>

      {/* Table */}
      <div className={scrollable
        ? "rounded-lg border border-border w-full overflow-hidden"
        : "rounded-lg border border-border w-full [&>div]:!overflow-x-hidden"
      }>
        <Table className={scrollable ? "w-max min-w-full" : "table-fixed w-full"}>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/50">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none"
                    style={scrollable ? { minWidth: header.column.getSize() } : undefined}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        header.column.getIsSorted() === "asc" ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronsUpDown className="w-3 h-3 opacity-40" />
                        )
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, ci) => (
                    <TableCell key={ci} className="px-3 py-3">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                  {resolvedEmptyText}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/40 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={scrollable
                        ? "px-3 py-2.5 text-sm whitespace-nowrap"
                        : "px-3 py-2.5 text-sm break-words"
                      }
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

      {/* Pagination */}
      {!loading && rows.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t.page} {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              {t.prev}
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              {t.next}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined) {
  if (!d) return "—"
  try { return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" }) }
  catch { return d }
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—"
  try { return new Date(d).toLocaleString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) }
  catch { return d }
}

function cell(v: unknown) {
  return <span className="text-foreground break-words">{v == null || v === "" ? <span className="text-muted-foreground">—</span> : String(v)}</span>
}

// ── Tab: Rooming List ─────────────────────────────────────────────────────────
type RoomingRow = {
  full_name: string | null
  room_type: string | null
  checkin: string | null
  checkout: string | null
  guests: number | null
  companion: string | null
  special_needs: string | null
}

function RoomingListTab({ hotels }: { hotels: string[] }) {
  const { t } = useLanguage()
  const [hotel, setHotel] = useState(hotels[0] ?? "")
  const { data, loading, error, trigger } = useGetRoomingList()

  useEffect(() => {
    if (hotels.length > 0 && !hotels.includes(hotel)) {
      setHotel(hotels[0] ?? "")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotels])

  useEffect(() => { if (hotel) trigger({ hotel }) }, [hotel])

  const rows = (data as RoomingRow[] | undefined) ?? []

  const columns = useMemo<ColumnDef<RoomingRow>[]>(() => [
    { accessorKey: "full_name",     header: t.roomingGuest,       cell: ({ getValue }) => cell(getValue()) },
    { accessorKey: "room_type",     header: t.roomingRoomType,     cell: ({ getValue }) => cell(getValue()) },
    { accessorKey: "checkin",       header: t.checkin,             cell: ({ getValue }) => fmtDate(getValue<string | null>()) },
    { accessorKey: "checkout",      header: t.checkout,            cell: ({ getValue }) => fmtDate(getValue<string | null>()) },
    { accessorKey: "guests",        header: t.roomingGuests,       cell: ({ getValue }) => cell(getValue()) },
    { accessorKey: "companion",     header: t.roomingCompanion,    cell: ({ getValue }) => cell(getValue()) },
    { accessorKey: "special_needs", header: t.roomingSpecialNeeds, cell: ({ getValue }) => cell(getValue()) },
  ], [t])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-foreground whitespace-nowrap">{t.hotelLabel}</label>
        <Select value={hotel} onValueChange={setHotel}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder={t.selectHotel} />
          </SelectTrigger>
          <SelectContent>
            {hotels.map((h) => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ReportTable
        data={rows}
        loading={loading}
        error={error}
        columns={columns as ColumnDef<Record<string, unknown>>[]}
        exportFilename={`rooming-list-${hotel.replace(/\s+/g, "-").toLowerCase()}.csv`}
        emptyText={t.noBookingsForHotel}
      />
    </div>
  )
}

// ── Full Report: column min-sizes by field name ───────────────────────────────
const FULL_REPORT_COL_SIZES: Record<string, number> = {
  id:                  70,
  booking_id:          90,
  status:             115,
  hotel:              200,
  full_name:          170,
  room_type:          150,
  checkin:            115,
  checkout:           115,
  created_at:         160,
  email:              220,
  mobile:             145,
  notes:              280,
  companion:          160,
  group_name:         160,
  amount:             115,
  guests:              85,
  changed_by:         140,
  change_description: 230,
}
const DEFAULT_FULL_COL_SIZE = 145

// ── Tab: Full Report ──────────────────────────────────────────────────────────
type FullReportRow = Record<string, unknown>

function FullReportTab() {
  const { data, loading, error, trigger } = useGetFullReport()

  useEffect(() => { trigger() }, [])

  const rows: FullReportRow[] = (data as FullReportRow[] | undefined) ?? []

  const columns = useMemo<ColumnDef<FullReportRow>[]>(() => {
    if (rows.length === 0) return []
    return Object.keys(rows[0]!).map((key) => ({
      accessorKey: key,
      header: key,
      size: FULL_REPORT_COL_SIZES[key] ?? DEFAULT_FULL_COL_SIZE,
      cell: ({ getValue }) => {
        const v = getValue<unknown>()
        if (key === "status") return <StatusBadge status={v} />
        if (key === "checkin" || key === "checkout") return fmtDate(v as string | null)
        if (key === "created_at") return fmtDateTime(v as string | null)
        return cell(v)
      },
    }))
  }, [rows])

  return (
    <ReportTable
      data={rows}
      loading={loading}
      error={error}
      columns={columns}
      exportFilename="full-report.csv"
      scrollable
    />
  )
}

// ── Tab: Payments ─────────────────────────────────────────────────────────────
type PaymentRow = {
  full_name: string | null
  hotel: string | null
  room_type: string | null
  amount: number | null
  status: string | null
  created_at: string | null
}

function PaymentsTab() {
  const { t } = useLanguage()
  const { data, loading, error, trigger } = useGetPayments()

  useEffect(() => { trigger() }, [])

  const rows = (data as PaymentRow[] | undefined) ?? []

  const columns = useMemo<ColumnDef<PaymentRow>[]>(() => [
    { accessorKey: "full_name",  header: t.roomingGuest,  cell: ({ getValue }) => cell(getValue()) },
    { accessorKey: "hotel",      header: t.hotel,         cell: ({ getValue }) => cell(getValue()) },
    { accessorKey: "room_type",  header: t.roomingRoomType, cell: ({ getValue }) => cell(getValue()) },
    {
      accessorKey: "amount",
      header: t.paymentAmount,
      cell: ({ getValue }) => {
        const v = getValue<number | null>()
        return v == null
          ? <span className="text-muted-foreground">—</span>
          : <span className="font-mono font-medium">{v.toLocaleString("el-GR")} €</span>
      },
    },
    { accessorKey: "status",     header: t.status,       cell: ({ getValue }) => <StatusBadge status={getValue()} /> },
    { accessorKey: "created_at", header: t.paymentDate,  cell: ({ getValue }) => fmtDateTime(getValue<string | null>()) },
  ], [t])

  return (
    <ReportTable
      data={rows}
      loading={loading}
      error={error}
      columns={columns as ColumnDef<Record<string, unknown>>[]}
      exportFilename="payments.csv"
    />
  )
}

// ── Tab: Changes ──────────────────────────────────────────────────────────────
type ChangeReportRow = {
  booking_id: number | null
  guest_name: string | null
  hotel: string | null
  changed_by: string | null
  changed_at: string | null
  change_description: string | null
  old_value: string | null
  new_value: string | null
  amount_delta: number | null
}

function ChangesTab() {
  const { t } = useLanguage()
  const { data, loading, error, trigger } = useGetChangesReport()

  useEffect(() => { trigger() }, [])

  const rows = (data as ChangeReportRow[] | undefined) ?? []

  const columns = useMemo<ColumnDef<ChangeReportRow>[]>(() => [
    { accessorKey: "booking_id",         header: t.changesBookingId,  cell: ({ getValue }) => cell(getValue()) },
    { accessorKey: "guest_name",         header: t.roomingGuest,      cell: ({ getValue }) => cell(getValue()) },
    { accessorKey: "hotel",              header: t.hotel,             cell: ({ getValue }) => cell(getValue()) },
    { accessorKey: "changed_by",         header: t.changesChangedBy,  cell: ({ getValue }) => cell(getValue()) },
    { accessorKey: "changed_at",         header: t.changesDate,       cell: ({ getValue }) => fmtDateTime(getValue<string | null>()) },
    { accessorKey: "change_description", header: t.colDescription,    cell: ({ getValue }) => cell(getValue()) },
    { accessorKey: "old_value",          header: t.changesOldValue,   cell: ({ getValue }) => cell(getValue()) },
    { accessorKey: "new_value",          header: t.changesNewValue,   cell: ({ getValue }) => cell(getValue()) },
    {
      accessorKey: "amount_delta",
      header: t.changesDelta,
      cell: ({ getValue }) => {
        const v = getValue<number | null>()
        if (v == null) return <span className="text-muted-foreground">—</span>
        if (v === 0) return <span className="text-muted-foreground">0 €</span>
        return (
          <span className={v > 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
            {v > 0 ? "+" : ""}{v.toLocaleString("el-GR")} €
          </span>
        )
      },
    },
  ], [t])

  return (
    <ReportTable
      data={rows}
      loading={loading}
      error={error}
      columns={columns as ColumnDef<Record<string, unknown>>[]}
      exportFilename="changes.csv"
    />
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ReportsTab({ hotelNames }: { hotelNames?: string[] | undefined }) {
  const { t } = useLanguage()
  const hotels = hotelNames && hotelNames.length > 0 ? hotelNames : HOTELS
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{t.reports}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rooming">
          {/* Horizontally scrollable tab bar on narrow screens */}
          <div className="overflow-x-auto pb-1 mb-4 -mx-1 px-1">
            <TabsList className="inline-flex min-w-max">
              <TabsTrigger value="rooming">{t.roomingList}</TabsTrigger>
              <TabsTrigger value="full">{t.fullReport}</TabsTrigger>
              <TabsTrigger value="payments">{t.paymentsReport}</TabsTrigger>
              <TabsTrigger value="changes">{t.changesReport}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="rooming">
            <RoomingListTab hotels={hotels} />
          </TabsContent>
          <TabsContent value="full">
            <FullReportTab />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentsTab />
          </TabsContent>
          <TabsContent value="changes">
            <ChangesTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
