
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { StaffMember } from "@/types"
import { Button } from "@/components/ui/button"

type ColumnsProps = {
  onEdit: (staff: StaffMember) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "GHS",
    }).format(amount)
}

export const getStaffPayrollColumns = ({ onEdit }: ColumnsProps): ColumnDef<StaffMember>[] => [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "role",
    header: "Role",
  },
  {
    accessorKey: "grossSalary",
    header: "Gross Salary (Annual)",
    cell: ({ row }) => formatCurrency(row.getValue("grossSalary"))
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const staff = row.original;
      return (
        <div className="text-right">
            <Button variant="outline" size="sm" onClick={() => onEdit(staff)}>Edit Payroll</Button>
        </div>
      )
    },
  },
];
