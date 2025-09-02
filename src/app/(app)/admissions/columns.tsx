
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Student } from "@/types"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"

type ColumnsProps = {
  onViewApplication: (student: Student) => void;
}


export const getColumns = ({ onViewApplication }: ColumnsProps): ColumnDef<Student>[] => [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "class",
    header: "Class",
  },
  {
    accessorKey: "admissionDate",
    header: "Admission Date",
    cell: ({ row }) => {
        const date = new Date(row.getValue("admissionDate"));
        return new Intl.DateTimeFormat('en-US').format(date);
    }
  },
  {
    accessorKey: "paymentStatus",
    header: "Payment Status",
    cell: ({ row }) => {
      const status = row.getValue("paymentStatus") as string;
      const variant = {
        "Paid": "default",
        "Pending": "secondary",
        "Unpaid": "destructive",
      }[status] ?? "secondary" as "default" | "secondary" | "destructive" | "outline" | null | undefined;
      return <Badge variant={variant} className="capitalize">{status || 'Pending'}</Badge>;
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const student = row.original

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
                <DropdownMenuItem onClick={() => onViewApplication(student)}>View Application</DropdownMenuItem>
                <DropdownMenuItem>Mark as Paid</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Reject Application</DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )
    },
  },
];

// We need to export a memoized version of the columns array
// to prevent react-table from re-rendering unnecessarily.
export const columns = getColumns({ onViewApplication: () => {} });
