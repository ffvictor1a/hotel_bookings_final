import { useMemo } from "react"
import { BedDouble } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../../lib/shadcn/card"
import { Skeleton } from "../../lib/shadcn/skeleton"
import type { AvailabilityRow } from "../data/types"

function ProgressBar({ pct }: { pct: number }) {
  const color =
    pct <= 60
      ? "bg-emerald-500 dark:bg-emerald-400"
      : pct <= 80
      ? "bg-amber-500 dark:bg-amber-400"
      : "bg-red-500 dark:bg-red-400"

  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function RemainingBadge({ remaining, total }: { remaining: number; total: number }) {
  const pct = total > 0 ? (1 - remaining / total) * 100 : 100
  const color =
    remaining === 0
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : pct > 80
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {remaining === 0 ? "Sold out" : `${remaining} free`}
    </span>
  )
}

type AllotmentsSectionProps = {
  rows: AvailabilityRow[]
  loading: boolean
}

export default function AllotmentsSection({ rows, loading }: AllotmentsSectionProps) {
  // Group by hotel
  const byHotel = useMemo(() => {
    const map: Record<string, AvailabilityRow[]> = {}
    for (const r of rows) {
      if (!map[r.hotel]) map[r.hotel] = []
      map[r.hotel]!.push(r)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [rows])

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <BedDouble className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Διαθέσιμα δωμάτια ανά τύπο</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent className="space-y-3">
                {[...Array(3)].map((__, j) => <Skeleton key={j} className="h-10 w-full" />)}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {byHotel.map(([hotel, hotelRows]) => {
            const hotelTotal = hotelRows.reduce((s, r) => s + r.total_allotment, 0)
            const hotelAvailable = hotelRows.reduce((s, r) => s + r.available, 0)

            return (
              <Card key={hotel} className="overflow-hidden">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold leading-snug">{hotel}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {hotelAvailable} από {hotelTotal} διαθέσιμα δωμάτια
                  </p>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-3">
                  {hotelRows.map((r) => {
                    const pct = r.total_allotment > 0
                      ? Math.round((r.booked_count / r.total_allotment) * 100)
                      : 100

                    return (
                      <div key={`${r.hotel}-${r.room_type}`} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-foreground">{r.room_type}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {r.booked_count}/{r.total_allotment}
                            </span>
                            <RemainingBadge remaining={r.available} total={r.total_allotment} />
                          </div>
                        </div>
                        <ProgressBar pct={pct} />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}
