
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { PayrollRun } from "@/types"
import { Button } from "@/components/ui/button"
import { format } from 'date-fns';

type ColumnsProps = {
  onView: (run: PayrollRun) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "GHS",
    }).format(amount)
}

export const getPayrollHistoryColumns = ({ onView }: ColumnsProps): ColumnDef<PayrollRun>[] => [
  {
    accessorKey: "period",
    header: "Period",
  },
  {
    accessorKey: "runDate",
    header: "Run Date",
    cell: ({ row }) => format(new Date(row.getValue("runDate")), 'PPP')
  },
  {
    accessorKey: "totalAmount",
    header: "Total Payroll",
    cell: ({ row }) => formatCurrency(row.getValue("totalAmount"))
  },
  {
    accessorKey: "employeeCount",
    header: "Employee Count",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const run = row.original;
      return (
        <div className="text-right">
            <Button variant="outline" size="sm" onClick={() => onView(run)}>View Details</Button>
        </div>
      )
    },
  },
];
