
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Transaction } from "@/types"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import { format } from "date-fns"

type ColumnsProps = {
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "GHS",
    }).format(amount)
}

export const getTransactionColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Transaction>[] => [
  {
    accessorKey: "date",
    header: ({ column }) => {
        return (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Date
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        )
    },
    cell: ({ row }) => <div className="pl-4">{format(new Date(row.getValue("date")), 'PPP')}</div>
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "categoryName",
    header: "Category",
    filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return <Badge variant={type === 'income' ? 'default' : 'secondary'} className="capitalize">{type}</Badge>;
    },
    filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
        return (
             <div className="text-right">
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Amount
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            </div>
        )
    },
    cell: ({ row }) => {
        const type = row.original.type;
        const amount = parseFloat(row.getValue("amount"))
        const formatted = formatCurrency(amount)
        return <div className={`text-right font-medium ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{formatted}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const transaction = row.original;
      // Disable actions for transactions derived from payments
      if (transaction.isFromPayment) {
        return null;
      }
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
                    <DropdownMenuItem onClick={() => onEdit(transaction)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(transaction)} className="text-destructive">Delete</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )
    },
  },
];
