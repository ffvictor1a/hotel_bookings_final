import { useMemo, useState } from "react"
import {
  ColumnDef, flexRender, getCoreRowModel, getSortedRowModel,
  getPaginationRowModel, SortingState, useReactTable,
} from "@tanstack/react-table"
import { ChevronUp, ChevronDown, History, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../../lib/shadcn/card"
import { Badge } from "../../lib/shadcn/badge"
import { Button } from "../../lib/shadcn/button"
import { Skeleton } from "../../lib/shadcn/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../lib/shadcn/table"
import { useLanguage } from "../../utils/LanguageContext"
import type { Change } from "../data/types"

type ColMeta = { className?: string }

function fmtDatetime(d: string) {
  const dt = new Date(d)
  const date = dt.toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "2-digit" })
  const time = dt.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })
  return `${date} ${time}`
}

function fmtEur(n: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n)
}

type ChangesSectionProps = {
  changes: Change[]
  loading: boolean
  onHeaderClick?: () => void
}

export default function ChangesSection({ changes, loading, onHeaderClick }: ChangesSectionProps) {
  const { t } = useLanguage()
  const [sorting, setSorting] = useState<SortingState>([{ id: "changed_at", desc: true }])

  const columns = useMemo<ColumnDef<Change>[]>(() => [
    {
      accessorKey: "guest_name",
      header: t.guestName,
      cell: ({ getValue }) => (
        <span className="font-medium text-foreground block w-full min-w-0 truncate">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "hotel",
      header: t.hotel,
      meta: { className: "hidden sm:table-cell" } satisfies ColMeta,
      cell: ({ getValue }) => (
        <span className="block w-full min-w-0 truncate text-muted-foreground text-xs">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "changed_by",
      header: t.colUser,
      meta: { className: "hidden md:table-cell" } satisfies ColMeta,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground block w-full min-w-0 truncate">
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: "changed_at",
      header: t.colDate,
      meta: { className: "hidden sm:table-cell" } satisfies ColMeta,
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {fmtDatetime(getValue<string>())}
        </span>
      ),
    },
    {
      accessorKey: "change_description",
      header: t.colDescription,
      cell: ({ getValue }) => (
        <span className="block w-full min-w-0 truncate text-sm text-foreground">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "old_value",
      header: t.colOldValue,
      meta: { className: "hidden lg:table-cell" } satisfies ColMeta,
      cell: ({ getValue }) => (
        <span className="block w-full min-w-0 truncate text-xs text-muted-foreground line-through decoration-muted-foreground/50">
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: "new_value",
      header: t.colNewValue,
      meta: { className: "hidden lg:table-cell" } satisfies ColMeta,
      cell: ({ getValue }) => (
        <span className="block w-full min-w-0 truncate text-xs font-medium text-foreground">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "amount_delta",
      header: t.colDifference,
      cell: ({ getValue, row }) => {
        const delta = getValue<number>()
        const c = row.original
        return (
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className={`text-xs font-semibold tabular-nums ${
              delta > 0 ? "text-emerald-600 dark:text-emerald-400"
              : delta < 0 ? "text-red-600 dark:text-red-400"
              : "text-muted-foreground"
            }`}>
              {delta !== 0 ? (delta > 0 ? "+" : "") + fmtEur(delta) : "—"}
            </span>
            <div className="flex gap-0.5 flex-wrap">
              {c.requires_payment === "yes" && (
                <Badge variant="outline" className="text-[10px] py-0 px-1 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700 flex items-center gap-0.5">
                  <ArrowUpRight className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">{t.requiresPayment}</span>
                </Badge>
              )}
              {c.requires_refund === "yes" && (
                <Badge variant="outline" className="text-[10px] py-0 px-1 bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700 flex items-center gap-0.5">
                  <ArrowDownRight className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">{t.requiresRefund}</span>
                </Badge>
              )}
            </div>
          </div>
        )
      },
    },
  ], [t])

  const table = useReactTable({
    data: changes,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <Card className="min-w-0 w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">{t.changesLog}</CardTitle>
          </div>
          {onHeaderClick && (
            <button onClick={onHeaderClick} className="text-xs text-primary hover:underline font-medium shrink-0">
              {t.viewAll}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {loading ? (
          <div className="space-y-2 px-4 sm:px-6 pb-6">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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
                          className={`px-2 sm:px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer select-none ${(h.column.columnDef.meta as ColMeta | undefined)?.className ?? ""}`}
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
                      <TableCell colSpan={columns.length} className="py-10 text-center text-sm text-muted-foreground">
                        {t.noChanges}
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/40 transition-colors">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}
                            className={`px-2 sm:px-4 py-2.5 text-sm text-muted-foreground overflow-hidden ${(cell.column.columnDef.meta as ColMeta | undefined)?.className ?? ""}`}
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
  )
}
