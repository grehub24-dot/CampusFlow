
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { StaffArrears, StaffMember } from "@/types"
import { Button } from "@/components/ui/button"

type ColumnsProps = {
  onEdit: (staff: StaffMember) => void;
  canEdit: boolean;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "GHS",
    }).format(amount)
}

export const getStaffPayrollColumns = ({ onEdit, canEdit }: ColumnsProps): ColumnDef<StaffMember>[] => [
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
    accessorKey: "arrears",
    header: "Arrears",
    cell: ({ row }) => {
        const arrears = row.getValue("arrears") as StaffArrears[] | undefined;
        const totalArrears = arrears?.reduce((sum, item) => sum + item.amount, 0) || 0;
        return formatCurrency(totalArrears);
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const staff = row.original;
      if (!canEdit) return null;
      return (
        <div className="text-right">
            <Button variant="outline" size="sm" onClick={() => onEdit(staff)}>Edit Payroll</Button>
        </div>
      )
    },
  },
];
