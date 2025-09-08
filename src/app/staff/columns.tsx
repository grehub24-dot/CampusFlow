
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { StaffMember } from "@/types"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

type ColumnsProps = {
  onEdit: (staff: StaffMember) => void;
  onDelete: (staff: StaffMember) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "GHS",
    }).format(amount)
}

export const getStaffColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<StaffMember>[] => [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "role",
    header: "Role",
  },
  {
    accessorKey: "employmentDate",
    header: "Employment Date",
    cell: ({ row }) => {
        const date = row.getValue("employmentDate") as string;
        return date ? format(new Date(date), 'PPP') : 'N/A';
    }
  },
  {
    accessorKey: "grossSalary",
    header: "Gross Salary (Annual)",
    cell: ({ row }) => formatCurrency(row.getValue("grossSalary"))
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <Badge variant={status === 'Active' ? 'default' : 'secondary'}>{status}</Badge>;
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const staff = row.original;
      return (
        <div className="text-right">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit(staff)}>Edit Staff</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(staff)} className="text-destructive">Delete Staff</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )
    },
  },
];
