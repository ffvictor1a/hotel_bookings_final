import { useEffect, useMemo, useState } from "react"
import {
  ColumnDef, flexRender, getCoreRowModel, getSortedRowModel,
  getPaginationRowModel, SortingState, useReactTable,
} from "@tanstack/react-table"
import { Download, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
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

const STATUS_CFG: Record<string, string> = {
  paid:      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-700",
  pending:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-700",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-700",
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0]!)
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v)
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Generic report table ──────────────────────────────────────────────────────
type ReportTableProps<T extends Record<string, unknown>> = {
  data: T[] | undefined
  loading: boolean
  error: string | null
  columns: ColumnDef<T>[]
  exportFilename: string
  emptyText?: string
}

function ReportTable<T extends Record<string, unknown>>({
  data, loading, error, columns, exportFilename, emptyText = "Δεν βρέθηκαν εγγραφές.",
}: ReportTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const rows = data ?? []

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
        Σφάλμα: {error}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Export bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? "Φόρτωση…" : `${rows.length} εγγραφές`}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => exportCsv(rows as Record<string, unknown>[], exportFilename)}
          disabled={loading || rows.length === 0}
        >
          <Download className="w-4 h-4" />
          Εξαγωγή CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border w-full">
        <Table className="table-fixed w-full">
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/50">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none"
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
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/40 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-2.5 text-sm break-words">
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
            Σελ. {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Προηγ.
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Επόμ.
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

function statusBadge(status: unknown) {
  const s = String(status ?? "").toLowerCase()
  const cls = STATUS_CFG[s] ?? "bg-muted text-muted-foreground"
  return <Badge variant="outline" className={`${cls} text-xs font-medium`}>{status == null ? "—" : String(status)}</Badge>
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

const ROOMING_COLS: ColumnDef<RoomingRow>[] = [
  { accessorKey: "full_name",     header: "Επισκέπτης",    cell: ({ getValue }) => cell(getValue()) },
  { accessorKey: "room_type",     header: "Τύπος Δωμ.",    cell: ({ getValue }) => cell(getValue()) },
  { accessorKey: "checkin",       header: "Check-in",      cell: ({ getValue }) => fmtDate(getValue<string | null>()) },
  { accessorKey: "checkout",      header: "Check-out",     cell: ({ getValue }) => fmtDate(getValue<string | null>()) },
  { accessorKey: "guests",        header: "Επισκέπτες",    cell: ({ getValue }) => cell(getValue()) },
  { accessorKey: "companion",     header: "Συνοδός",       cell: ({ getValue }) => cell(getValue()) },
  { accessorKey: "special_needs", header: "Ειδικές Ανάγκες", cell: ({ getValue }) => cell(getValue()) },
]

function RoomingListTab() {
  const [hotel, setHotel] = useState(HOTELS[0]!)
  const { data, loading, error, trigger } = useGetRoomingList()

  useEffect(() => { trigger({ hotel }) }, [hotel])

  const rows = (data as RoomingRow[] | undefined) ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-foreground whitespace-nowrap">Ξενοδοχείο:</label>
        <Select value={hotel} onValueChange={setHotel}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Επιλέξτε ξενοδοχείο" />
          </SelectTrigger>
          <SelectContent>
            {HOTELS.map((h) => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ReportTable
        data={rows}
        loading={loading}
        error={error}
        columns={ROOMING_COLS as ColumnDef<Record<string, unknown>>[]}
        exportFilename={`rooming-list-${hotel.replace(/\s+/g, "-").toLowerCase()}.csv`}
        emptyText="Δεν βρέθηκαν κρατήσεις για αυτό το ξενοδοχείο."
      />
    </div>
  )
}

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
      cell: ({ getValue }) => {
        const v = getValue<unknown>()
        if (key === "status") return statusBadge(v)
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

const PAYMENT_COLS: ColumnDef<PaymentRow>[] = [
  { accessorKey: "full_name",  header: "Επισκέπτης",   cell: ({ getValue }) => cell(getValue()) },
  { accessorKey: "hotel",      header: "Ξενοδοχείο",   cell: ({ getValue }) => cell(getValue()) },
  { accessorKey: "room_type",  header: "Τύπος Δωμ.",   cell: ({ getValue }) => cell(getValue()) },
  {
    accessorKey: "amount",
    header: "Ποσό (€)",
    cell: ({ getValue }) => {
      const v = getValue<number | null>()
      return v == null
        ? <span className="text-muted-foreground">—</span>
        : <span className="font-mono font-medium">{v.toLocaleString("el-GR")} €</span>
    },
  },
  { accessorKey: "status",     header: "Κατάσταση",    cell: ({ getValue }) => statusBadge(getValue()) },
  { accessorKey: "created_at", header: "Ημ/νία",       cell: ({ getValue }) => fmtDateTime(getValue<string | null>()) },
]

function PaymentsTab() {
  const { data, loading, error, trigger } = useGetPayments()

  useEffect(() => { trigger() }, [])

  const rows = (data as PaymentRow[] | undefined) ?? []

  return (
    <ReportTable
      data={rows}
      loading={loading}
      error={error}
      columns={PAYMENT_COLS as ColumnDef<Record<string, unknown>>[]}
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

const CHANGES_COLS: ColumnDef<ChangeReportRow>[] = [
  { accessorKey: "booking_id",        header: "ID Κράτ.",       cell: ({ getValue }) => cell(getValue()) },
  { accessorKey: "guest_name",        header: "Επισκέπτης",     cell: ({ getValue }) => cell(getValue()) },
  { accessorKey: "hotel",             header: "Ξενοδοχείο",     cell: ({ getValue }) => cell(getValue()) },
  { accessorKey: "changed_by",        header: "Άλλαξε από",     cell: ({ getValue }) => cell(getValue()) },
  { accessorKey: "changed_at",        header: "Ημ/νία Αλλαγής", cell: ({ getValue }) => fmtDateTime(getValue<string | null>()) },
  { accessorKey: "change_description",header: "Περιγραφή",      cell: ({ getValue }) => cell(getValue()) },
  { accessorKey: "old_value",         header: "Παλιά Τιμή",     cell: ({ getValue }) => cell(getValue()) },
  { accessorKey: "new_value",         header: "Νέα Τιμή",       cell: ({ getValue }) => cell(getValue()) },
  {
    accessorKey: "amount_delta",
    header: "Διαφορά (€)",
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
]

function ChangesTab() {
  const { data, loading, error, trigger } = useGetChangesReport()

  useEffect(() => { trigger() }, [])

  const rows = (data as ChangeReportRow[] | undefined) ?? []

  return (
    <ReportTable
      data={rows}
      loading={loading}
      error={error}
      columns={CHANGES_COLS as ColumnDef<Record<string, unknown>>[]}
      exportFilename="changes.csv"
    />
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ReportsTab() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Αναφορές</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rooming">
          {/* Horizontally scrollable tab bar on narrow screens */}
          <div className="overflow-x-auto pb-1 mb-4 -mx-1 px-1">
            <TabsList className="inline-flex min-w-max">
              <TabsTrigger value="rooming">Rooming List</TabsTrigger>
              <TabsTrigger value="full">Full Report</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="changes">Changes</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="rooming">
            <RoomingListTab />
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
