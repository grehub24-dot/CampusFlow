

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
import { cn } from "@/lib/utils"

type ColumnsProps = {
  onViewApplication: (student: Student) => void;
  onPay: (student: Student) => void;
  canCreatePayment: boolean;
  canDeleteAdmission: boolean;
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

export const getColumns = ({ onViewApplication, onPay, canCreatePayment, canDeleteAdmission }: ColumnsProps): ColumnDef<Student>[] => [
  {
    accessorKey: "admissionId",
    header: "Admission ID",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "class",
    header: "Class",
  },
   {
    accessorKey: "dateOfBirth",
    header: "Age",
    cell: ({ row }) => {
        const dob = row.getValue("dateOfBirth") as string;
        return dob ? calculateAge(dob) : "N/A";
    }
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
      const status = row.original.paymentStatus || "Pending";
      
      return (
        <Badge 
          className={cn(
            "capitalize text-white",
            status === 'Paid' ? 'bg-green-600 hover:bg-green-700' :
            status === 'Part-Payment' ? 'bg-amber-500 hover:bg-amber-600' :
            status === 'Unpaid' ? 'bg-red-600 hover:bg-red-700' :
            status === 'Pending' ? 'bg-gray-500' : ''
          )}
        >
          {status || 'Pending'}
        </Badge>
      );
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const student = row.original

      return (
        <div className="flex justify-end items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPay(student)}
                disabled={student.paymentStatus === 'Paid' || !canCreatePayment}
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
                <DropdownMenuItem onClick={() => onViewApplication(student)}>View Application</DropdownMenuItem>
                {canDeleteAdmission && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">Reject Application</DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )
    },
  },
];
