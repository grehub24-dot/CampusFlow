
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Payment } from "@/types"
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
  onViewPayment: (payment: Payment) => void;
  onViewStudent: (studentId: string) => void;
}

export const paymentColumns = ({ onViewPayment, onViewStudent }: ColumnsProps): ColumnDef<Payment>[] => [
  {
    accessorKey: "studentName",
    header: "Student Name",
  },
  {
    accessorKey: "amount",
    header: "Amount Paid",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "GHS",
      }).format(amount)
      return <div className="font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
        const date = new Date(row.getValue("date"));
        return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
    }
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant = {
        "Full Payment": "default",
        "Part Payment": "outline",
        "Failed": "destructive",
      }[status] ?? "default" as "default" | "secondary" | "destructive" | "outline" | null | undefined;
      return <Badge variant={variant} className={cn(
        status === 'Full Payment' && 'bg-green-600 hover:bg-green-700',
        status === 'Part Payment' && 'border-orange-500 text-orange-500',
        "capitalize"
      )}>{status}</Badge>;
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const payment = row.original;
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
                <DropdownMenuItem onClick={() => onViewPayment(payment)}>View Payment</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewStudent(payment.studentId)}>View Student</DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )
    },
  },
]
