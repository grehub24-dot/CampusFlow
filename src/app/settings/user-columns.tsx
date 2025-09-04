
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { User } from "@/types"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export const userColumns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
        const name = row.getValue("name") as string;
        const email = row.original.email;
        const fallback = name.split(' ').map(n => n[0]).join('');
        return (
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${name}`} />
                    <AvatarFallback>{fallback}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="font-medium">{name}</span>
                    <span className="text-muted-foreground text-sm">{email}</span>
                </div>
            </div>
        )
    }
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      const variant = {
        "Admin": "default",
        "Teacher": "secondary",
        "Accountant": "outline",
      }[role] ?? "default" as "default" | "secondary" | "destructive" | "outline" | null | undefined;
      return <Badge variant={variant}>{role}</Badge>
    }
  },
  {
    accessorKey: "lastLogin",
    header: "Last Login",
    cell: ({ row }) => {
        const date = new Date(row.getValue("lastLogin"));
        return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
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
                <DropdownMenuItem>Edit user</DropdownMenuItem>
                <DropdownMenuItem>Reset password</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Deactivate user</DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )
    },
  },
]
