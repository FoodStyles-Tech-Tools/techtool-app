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

export default function ProjectsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <Skeleton className="h-9 w-64" />

      <Card className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 py-2 text-xs">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="h-9 py-2 text-xs">
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead className="h-9 py-2 text-xs">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="h-9 py-2 text-xs">
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead className="h-9 py-2 text-xs">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="h-9 py-2 text-xs">
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead className="h-9 py-2 text-xs text-right">
                <Skeleton className="h-4 w-16 ml-auto" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i} className="hover:bg-muted/50">
                <TableCell className="py-2">
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="py-2">
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center space-x-1.5">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="py-2">
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell className="py-2">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Skeleton className="h-8 w-8 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}


