
"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import type { TransactionCategory } from "@/types"
import { DataTableFacetedFilter } from "../students/data-table-faceted-filter"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[],
  timeFilter: 'all' | 'today' | 'week' | 'month';
  onTimeFilterChange: (filter: 'all' | 'today' | 'week' | 'month') => void;
}

const typeOptions = [
    { label: "Income", value: "income" },
    { label: "Expense", value: "expense" },
]

export function TransactionsTable<TData, TValue>({
  columns,
  data,
  timeFilter,
  onTimeFilterChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center py-4 gap-2 flex-wrap">
            <Input
            placeholder="Filter by description..."
            value={(table.getColumn("description")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
                table.getColumn("description")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
            />
            <DataTableFacetedFilter
                column={table.getColumn("type")}
                title="Type"
                options={typeOptions}
            />
             <div className="flex items-center gap-1 ml-auto">
                <Button variant={timeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => onTimeFilterChange('all')}>All</Button>
                <Button variant={timeFilter === 'today' ? 'default' : 'outline'} size="sm" onClick={() => onTimeFilterChange('today')}>Today</Button>
                <Button variant={timeFilter === 'week' ? 'default' : 'outline'} size="sm" onClick={() => onTimeFilterChange('week')}>This Week</Button>
                <Button variant={timeFilter === 'month' ? 'default' : 'outline'} size="sm" onClick={() => onTimeFilterChange('month')}>This Month</Button>
            </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
                Total {table.getFilteredRowModel().rows.length} row(s).
            </div>
            <div className="flex items-center space-x-2">
                 <p className="text-sm font-medium">
                    Page {table.getState().pagination.pageIndex + 1} of{" "}
                    {table.getPageCount()}
                </p>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Next
                </Button>
            </div>
        </div>
      </CardContent>
    </Card>
  )
}
