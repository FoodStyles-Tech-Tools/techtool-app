"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

type ExportSummary = {
  sessions: number
  clockifyRows: number
  tickets: number
}

export default function ReportClient() {
  const [isExporting, setIsExporting] = useState(false)
  const [summary, setSummary] = useState<ExportSummary | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch("/api/report/export-google-sheet", {
        method: "POST",
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || "Failed to export data")
      }

      setSummary(data?.summary || null)
      toast("Exported to Google Sheet.", "success")
    } catch (error: any) {
      console.error("Google Sheets export failed:", error)
      toast(error?.message || "Failed to export data.", "error")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report</CardTitle>
          <CardDescription>
            Export the Clockify and ticket datasets to the configured Google Sheet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </span>
            ) : (
              "Export to Google Sheet"
            )}
          </Button>

          {summary && (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              <p>Sessions exported: {summary.sessions}</p>
              <p>Clockify rows written: {summary.clockifyRows}</p>
              <p>Tickets written: {summary.tickets}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
