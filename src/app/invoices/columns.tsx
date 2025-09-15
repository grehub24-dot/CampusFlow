
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Invoice } from "@/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"

type ColumnsProps = {
  onViewInvoice: (invoice: Invoice) => void;
  onSendReminder: (invoice: Invoice) => void;
  onPay: (invoice: Invoice) => void;
  canPay: boolean;
  canSendReminder: boolean;
}

export const getInvoiceColumns = ({ onViewInvoice, onSendReminder, onPay, canPay, canSendReminder }: ColumnsProps): ColumnDef<Invoice>[] => [
  {
    accessorKey: "studentName",
    header: "Student Name",
  },
    {
    accessorKey: "admissionId",
    header: "Admission ID",
  },
  {
    accessorKey: "amount",
    header: "Amount",
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
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => {
        const date = new Date(row.getValue("dueDate"));
        return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const invoice = row.original;
      return (
        <div className="flex justify-end items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onPay(invoice)} disabled={!canPay}>
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
                    <DropdownMenuItem onClick={() => onViewInvoice(invoice)}>View Invoice</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSendReminder(invoice)} disabled={!canSendReminder}>Send Reminder</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )
    },
  },
];

export const invoiceColumns = getInvoiceColumns({ 
    onViewInvoice: () => {}, 
    onSendReminder: () => {}, 
    onPay: () => {},
    canPay: false,
    canSendReminder: false,
});

    