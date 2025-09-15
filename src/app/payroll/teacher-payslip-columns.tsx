
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Payslip } from "@/types"
import { Button } from "@/components/ui/button"

type ColumnsProps = {
  onView: (payslip: Payslip) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "GHS",
    }).format(amount)
}

export const getTeacherPayslipColumns = ({ onView }: ColumnsProps): ColumnDef<Payslip>[] => [
  {
    accessorKey: "period",
    header: "Period",
  },
  {
    accessorKey: "grossSalary",
    header: "Gross Salary",
    cell: ({ row }) => formatCurrency(row.getValue("grossSalary"))
  },
  {
    accessorKey: "netSalary",
    header: "Net Salary",
    cell: ({ row }) => formatCurrency(row.getValue("netSalary"))
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const payslip = row.original;
      return (
        <div className="text-right">
            <Button variant="outline" size="sm" onClick={() => onView(payslip)}>View Payslip</Button>
        </div>
      )
    },
  },
];
