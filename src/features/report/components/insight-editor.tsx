"use client"

import { useEffect, useState, type ReactNode } from "react"
import { lazyComponent } from "@lib/lazy-component"
import { Button } from "@client/components/ui/button"

const RichTextEditor = lazyComponent(
  () => import("@client/components/rich-text-editor").then((mod) => mod.RichTextEditor),
)

type ChartWithInsightProps = {
  title: string
  insight: string
  onSave: (html: string) => void
  saving: boolean
  children: ReactNode
}

type InsightEditorProps = {
  value: string
  onSave: (html: string) => void
  saving: boolean
  placeholder?: string
}

export function ChartWithInsight({
  title,
  insight,
  onSave,
  saving,
  children,
}: ChartWithInsightProps) {
  return (
    <section className="space-y-3">
      {children}
      <div className="rounded-md border border-slate-200 bg-white p-3 sm:p-4">
        <div className="mb-3">
          <h4 className="text-sm font-medium">Insights - {title}</h4>
          <p className="text-xs text-slate-500">
            Summarize trends, anomalies, and actions based on the chart.
          </p>
        </div>
        <InsightEditor
          value={insight}
          onSave={onSave}
          saving={saving}
          placeholder={`Add insights for ${title}...`}
        />
      </div>
    </section>
  )
}

export function InsightEditor({
  value,
  onSave,
  saving,
  placeholder = "Add insights...",
}: InsightEditorProps) {
  const [localValue, setLocalValue] = useState(value)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!dirty) {
      setLocalValue(value)
    }
  }, [value, dirty])

  const handleChange = (html: string) => {
    setLocalValue(html)
    setDirty(html !== value)
  }

  const handleSave = () => {
    if (!dirty) return
    onSave(localValue)
    setDirty(false)
  }

  return (
    <div className="space-y-3">
      <RichTextEditor
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        compact
        minHeight={120}
        showToolbarOnFocus
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{dirty ? "Unsaved changes" : "No pending changes"}</p>
        <Button size="sm" onClick={handleSave} disabled={!dirty || saving} className="min-w-[112px]">
          {saving ? "Saving..." : "Save insight"}
        </Button>
      </div>
    </div>
  )
}
