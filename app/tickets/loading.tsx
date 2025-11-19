import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function TicketsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-[180px]" />
        <Skeleton className="h-9 w-[180px]" />
      </div>

      <Card className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 py-2 text-xs">
                <Skeleton className="h-4 w-8" />
              </TableHead>
              <TableHead className="h-9 py-2 text-xs w-[400px] min-w-[300px]">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="h-9 py-2 text-xs">
                <Skeleton className="h-4 w-12" />
              </TableHead>
              <TableHead className="h-9 py-2 text-xs">
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead className="h-9 py-2 text-xs">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="h-9 py-2 text-xs">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="h-9 py-2 text-xs">
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead className="h-9 py-2 text-xs">
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead className="h-9 py-2 text-xs">
                <Skeleton className="h-4 w-20" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <TableRow key={i} className="hover:bg-muted/50">
                <TableCell className="py-2">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-6 w-6" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </TableCell>
                <TableCell className="py-2 w-[400px] min-w-[300px]">
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-3/4" />
                </TableCell>
                <TableCell className="py-2">
                  <Skeleton className="h-7 w-[100px]" />
                </TableCell>
                <TableCell className="py-2">
                  <Skeleton className="h-7 w-[140px]" />
                </TableCell>
                <TableCell className="py-2">
                  <Skeleton className="h-7 w-[120px]" />
                </TableCell>
                <TableCell className="py-2">
                  <Skeleton className="h-7 w-[100px]" />
                </TableCell>
                <TableCell className="py-2">
                  <Skeleton className="h-7 w-[150px]" />
                </TableCell>
                <TableCell className="py-2">
                  <Skeleton className="h-7 w-[150px]" />
                </TableCell>
                <TableCell className="py-2">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}


