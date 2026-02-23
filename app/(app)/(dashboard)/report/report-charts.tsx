"use client"

import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Cell,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  VolumeByWeek,
  RequesterCount,
  StatusCounts,
  AvgResponseTimeByWeekItem,
  AvgLeadTimeByWeekItem,
  ReportDataPayload,
} from "@/types/api/report"

const CHART_COLORS = ["#2563eb", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]
const AXIS_TICK = { fontSize: 12, fill: "hsl(var(--muted-foreground))" }
const LEGEND_STYLE = { fontSize: "12px", paddingTop: "8px" }
const WEEK_GROUP_GAP = "4%"
const WEEK_BAR_GAP = 6
const WEEK_BAR_SIZE = 12
const TOOLTIP_STYLE = {
  borderRadius: "0.5rem",
  border: "1px solid hsl(var(--border))",
  backgroundColor: "hsl(var(--background))",
  boxShadow: "0 16px 30px -20px hsl(var(--foreground) / 0.35)",
}
const VOLUME_TYPE_ORDER = ["bug", "task", "request"] as const
const VOLUME_TYPE_COLOR: Record<string, string> = {
  bug: "#ef4444",
  task: "#f59e0b",
  request: "#3b82f6",
}
const PRIORITY_ORDER = ["urgent", "high", "medium", "low"] as const
const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#111827",
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#9ca3af",
}
function formatSeriesLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
}

function truncateLabel(value: string, maxLength = 24): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`
}

function normalizeSeriesKey(key: string): string {
  return key.trim().toLowerCase()
}

function orderVolumeTypes(types: string[]): string[] {
  const preferred = VOLUME_TYPE_ORDER.filter((preferredKey) =>
    types.some((type) => normalizeSeriesKey(type) === preferredKey)
  ).map((preferredKey) => types.find((type) => normalizeSeriesKey(type) === preferredKey)!)

  const others = types.filter(
    (type) => !VOLUME_TYPE_ORDER.includes(normalizeSeriesKey(type) as (typeof VOLUME_TYPE_ORDER)[number])
  )

  return [...preferred, ...others]
}

function getVolumeTypeColor(type: string, fallbackIndex: number): string {
  return VOLUME_TYPE_COLOR[normalizeSeriesKey(type)] ?? CHART_COLORS[fallbackIndex % CHART_COLORS.length]
}

function orderPriorities(priorities: string[]): string[] {
  const preferred = PRIORITY_ORDER.filter((preferredKey) =>
    priorities.some((priority) => normalizeSeriesKey(priority) === preferredKey)
  ).map((preferredKey) => priorities.find((priority) => normalizeSeriesKey(priority) === preferredKey)!)

  const others = priorities.filter(
    (priority) => !PRIORITY_ORDER.includes(normalizeSeriesKey(priority) as (typeof PRIORITY_ORDER)[number])
  )

  return [...preferred, ...others]
}

function getPriorityColor(priority: string, fallbackIndex: number): string {
  return PRIORITY_COLOR[normalizeSeriesKey(priority)] ?? CHART_COLORS[fallbackIndex % CHART_COLORS.length]
}

function VolumeLegend({ types }: { types: string[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 text-xs sm:text-sm">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <span className="h-2.5 w-6 rounded-full bg-emerald-600" />
        Total
      </span>
      {types.map((type, index) => {
        const color = getVolumeTypeColor(type, index)
        return (
          <span key={type} className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: color }} />
            {formatSeriesLabel(type)}
          </span>
        )
      })}
    </div>
  )
}

/** Latency in days, max 2 decimal places. */
function formatDays(days: number): string {
  const value = Number(days.toFixed(2))
  return value === 1 ? "1 day" : `${value} days`
}

function formatCompactDays(days: number): string {
  return `${Number(days.toFixed(1))}d`
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="space-y-1 border-b bg-muted/20 px-4 py-4 sm:px-5">
        <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
        <CardDescription className="text-xs leading-relaxed sm:text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-3 py-4 sm:px-5 sm:py-5">{children}</CardContent>
    </Card>
  )
}

/** 1. Volume Ticket: Combo (Line total + Bar by type). */
export function ReportVolumeChart({ data }: { data: VolumeByWeek[] }) {
  if (data.length === 0) {
    return (
      <ChartCard
        title="Volume Ticket"
        description="Total tickets and breakdown by type per ISO week (created_at)."
      >
        <p className="text-sm text-muted-foreground">No tickets in this range.</p>
      </ChartCard>
    )
  }

  const totalsByType = data.reduce<Record<string, number>>((acc, row) => {
    for (const [type, count] of Object.entries(row.byType)) {
      acc[type] = (acc[type] ?? 0) + count
    }
    return acc
  }, {})

  const types = orderVolumeTypes(Object.keys(totalsByType))
  const chartData = data.map((d) => ({
    name: d.weekLabel,
    total: d.total,
    ...d.byType,
  }))

  return (
    <ChartCard
      title="Volume Ticket"
      description="Total tickets and breakdown by type per ISO week (created_at)."
    >
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 12, right: 16, left: 4, bottom: 0 }}
            barCategoryGap={WEEK_GROUP_GAP}
            barGap={WEEK_BAR_GAP}
          >
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.45)" }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number | undefined, name: string | undefined) => [
                value ?? 0,
                formatSeriesLabel(name ?? ""),
              ]}
              labelFormatter={(label) => `Week ${label}`}
            />
            <Legend wrapperStyle={LEGEND_STYLE} content={() => <VolumeLegend types={types} />} />
            <Line
              type="monotone"
              dataKey="total"
              name="Total tickets"
              stroke="#16a34a"
              strokeWidth={2.5}
              dot={{ r: 2.5, strokeWidth: 1, fill: "#16a34a" }}
              activeDot={{ r: 4.5, fill: "#15803d" }}
              label={{ position: "top", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            {types.map((type, i) => (
              <Bar
                key={type}
                dataKey={type}
                name={formatSeriesLabel(type)}
                fill={getVolumeTypeColor(type, i)}
                barSize={WEEK_BAR_SIZE}
                radius={[4, 4, 0, 0]}
                label={{ position: "top", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

/** 2. Requester Analysis: Horizontal bar, ticket count per requester. */
export function ReportRequesterChart({ data }: { data: RequesterCount[] }) {
  const topN = 12
  const rest = data.slice(topN)
  const restCount = rest.reduce((sum, row) => sum + row.count, 0)
  const chartData = data.slice(0, topN).map((row) => {
    const fullName = row.name || row.email || row.id
    return {
      name: fullName,
      shortName: truncateLabel(fullName),
      count: row.count,
    }
  })

  if (restCount > 0) {
    chartData.push({ name: "Others", shortName: "Others", count: restCount })
  }

  if (chartData.length === 0) {
    return (
      <ChartCard
        title="Requester Analysis"
        description="Ticket count per requester (created_at in range)."
      >
        <p className="text-sm text-muted-foreground">No data in this range.</p>
      </ChartCard>
    )
  }

  const chartHeight = Math.max(320, chartData.length * 34)

  return (
    <ChartCard
      title="Requester Analysis"
      description="Top requesters in this range (remaining grouped as Others)."
    >
      <div className="w-full" style={{ height: `${chartHeight}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 84, bottom: 8 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="shortName"
              width={78}
              tick={{ ...AXIS_TICK, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number | undefined) => [value ?? 0, "Tickets"]}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as { name?: string } | undefined
                return row?.name ?? ""
              }}
            />
            <Bar
              dataKey="count"
              name="Tickets"
              radius={[0, 4, 4, 0]}
              maxBarSize={26}
              label={{ position: "right", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

/** 3. Current Status: KPI cards (Open, In Progress, Done). */
export function ReportStatusCards({ data }: { data: StatusCounts }) {
  const items = [
    {
      key: "open",
      label: "Open",
      value: data.open,
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      fillClass: "bg-amber-500",
    },
    {
      key: "in-progress",
      label: "In Progress",
      value: data.inProgress,
      badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
      fillClass: "bg-sky-500",
    },
    {
      key: "done",
      label: "Done",
      value: data.done,
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      fillClass: "bg-emerald-500",
    },
  ] as const

  const total = items.reduce((sum, item) => sum + item.value, 0)

  return (
    <ChartCard
      title="Current Status"
      description="Open, In Progress, and Done (completed/cancelled/rejected)."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((item) => {
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0
          const visibleWidth = item.value > 0 ? Math.max(percentage, 8) : 0
          return (
            <div key={item.key} className="rounded-lg border bg-background p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${item.badgeClass}`}>
                  {percentage}%
                </span>
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{item.value}</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${item.fillClass}`} style={{ width: `${visibleWidth}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}

/** 4. Average Response Time: assigned_at - created_at, latency in days. */
export function ReportResponseTimeChart({ data }: { data: AvgResponseTimeByWeekItem[] }) {
  const priorities = orderPriorities(
    Array.from(new Set(data.flatMap((week) => week.byPriority.map((p) => p.priority))))
  )
  const chartData = data.map((week) => {
    const row: Record<string, number | string> = { name: week.weekLabel }
    for (const priority of week.byPriority) {
      row[priority.priority] = Number(priority.averageDays.toFixed(2))
    }
    return row
  })

  if (chartData.length === 0 || priorities.length === 0) {
    return (
      <ChartCard
        title="Average Response Time"
        description="assigned_at - created_at by week and priority (excluding unassigned)."
      >
        <p className="text-sm text-muted-foreground">No tickets with assigned_at in range.</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title="Average Response Time"
      description="assigned_at - created_at by week and priority (excluding unassigned)."
    >
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 14, left: 6, bottom: 0 }}
            barCategoryGap={WEEK_GROUP_GAP}
            barGap={WEEK_BAR_GAP}
          >
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis
              tick={AXIS_TICK}
              tickFormatter={(value: number) => formatCompactDays(Number(value))}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.45)" }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number | undefined, name: string | undefined) => [
                formatDays(Number(value ?? 0)),
                formatSeriesLabel(name ?? ""),
              ]}
              labelFormatter={(label) => `Week ${label}`}
            />
            <Legend wrapperStyle={LEGEND_STYLE} />
            {priorities.map((priority, i) => (
              <Bar
                key={priority}
                dataKey={priority}
                name={formatSeriesLabel(priority)}
                fill={getPriorityColor(priority, i)}
                barSize={WEEK_BAR_SIZE}
                radius={[4, 4, 0, 0]}
                label={{
                  position: "top",
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                  formatter: (value: unknown) => formatCompactDays(Number(value ?? 0)),
                }}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

/** 5. Average Lead Time: completed_at - created_at, latency in days. */
export function ReportLeadTimeChart({ data }: { data: AvgLeadTimeByWeekItem[] }) {
  const priorities = orderPriorities(
    Array.from(new Set(data.flatMap((week) => week.byPriority.map((p) => p.priority))))
  )
  const chartData = data.map((week) => {
    const row: Record<string, number | string> = { name: week.weekLabel }
    for (const priority of week.byPriority) {
      row[priority.priority] = Number(priority.averageDays.toFixed(2))
    }
    return row
  })

  if (chartData.length === 0 || priorities.length === 0) {
    return (
      <ChartCard
        title="Average Lead Time"
        description="completed_at - created_at by week and priority."
      >
        <p className="text-sm text-muted-foreground">No completed tickets in range.</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Average Lead Time" description="completed_at - created_at by week and priority.">
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 14, left: 6, bottom: 0 }}
            barCategoryGap={WEEK_GROUP_GAP}
            barGap={WEEK_BAR_GAP}
          >
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis
              tick={AXIS_TICK}
              tickFormatter={(value: number) => formatCompactDays(Number(value))}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.45)" }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number | undefined, name: string | undefined) => [
                formatDays(Number(value ?? 0)),
                formatSeriesLabel(name ?? ""),
              ]}
              labelFormatter={(label) => `Week ${label}`}
            />
            <Legend wrapperStyle={LEGEND_STYLE} />
            {priorities.map((priority, i) => (
              <Bar
                key={priority}
                dataKey={priority}
                name={formatSeriesLabel(priority)}
                fill={getPriorityColor(priority, i)}
                barSize={WEEK_BAR_SIZE}
                radius={[4, 4, 0, 0]}
                label={{
                  position: "top",
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                  formatter: (value: unknown) => formatCompactDays(Number(value ?? 0)),
                }}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

/** All report charts from session data. */
export function ReportCharts({ data }: { data: ReportDataPayload | null }) {
  if (!data) return null

  return (
    <div className="space-y-6">
      <ReportVolumeChart data={data.volumeByWeek} />
      <ReportStatusCards data={data.statusCounts} />
      <ReportRequesterChart data={data.requesters} />
      <ReportResponseTimeChart data={data.avgResponseTimeByWeek} />
      <ReportLeadTimeChart data={data.avgLeadTimeByWeek} />
    </div>
  )
}
