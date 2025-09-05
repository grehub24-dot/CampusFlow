
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Student } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

type ColumnsProps = {
  onEdit: (student: Student) => void;
  onViewDetails: (student: Student) => void;
  onDelete: (student: Student) => void;
  onPay: (student: Student) => void;
}

const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};


export const getColumns = ({ onEdit, onViewDetails, onDelete, onPay }: ColumnsProps): ColumnDef<Student>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "dateOfBirth",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Age
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
        const dob = row.getValue("dateOfBirth") as string;
        return <div className="pl-4">{dob ? calculateAge(dob) : "N/A"}</div>;
    },
    sortingFn: (rowA, rowB, columnId) => {
        const ageA = calculateAge(rowA.getValue(columnId));
        const ageB = calculateAge(rowB.getValue(columnId));
        return ageA - ageB;
    }
  },
  {
    accessorKey: "class",
    header: "Class",
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "guardianName",
    header: "Guardian Name",
  },
  {
    accessorKey: "guardianPhone",
    header: "Guardian Phone",
  },
  {
    accessorKey: "paymentStatus",
    header: "Fees Status",
    cell: ({ row }) => {
      const status = row.getValue("paymentStatus") as string || "Pending";
      const variant = {
        "Paid": "default",
        "Part-Payment": "outline",
        "Pending": "secondary",
        "Unpaid": "destructive",
      }[status] ?? "secondary" as "default" | "secondary" | "destructive" | "outline" | null | undefined;
      
      return (
        <Badge variant={variant} className={cn(
            status === 'Paid' && 'bg-green-600 hover:bg-green-700',
            status === 'Part-Payment' && 'border-amber-500 text-amber-500',
            "capitalize"
        )}>
            {status || 'Pending'}
        </Badge>
      );
    },
     filterFn: (row, id, value) => {
      const status = row.getValue(id) as string || "Pending";
      return value.includes(status)
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant = {
        "Active": "default",
        "Inactive": "secondary",
        "Graduated": "outline",
      }[status] ?? "default" as "default" | "secondary" | "destructive" | "outline" | null | undefined;

      return <Badge variant={variant}>{status}</Badge>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const student = row.original
      
      return (
        <div className="flex items-center justify-end gap-2">
           <Button
                variant="outline"
                size="sm"
                onClick={() => onPay(student)}
                disabled={student.paymentStatus === 'Paid'}
            >
                Pay
            </Button>
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(student.id)}
                >
                Copy student ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onViewDetails(student)}>View details</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(student)}>Edit student</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(student)} className="text-destructive">Delete student</DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )
    },
  },
]
