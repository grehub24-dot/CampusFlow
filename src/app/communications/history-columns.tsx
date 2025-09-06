
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Message } from "@/types"
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from "@/components/ui/checkbox"


const getStatusVariant = (status: string) => {
    switch (status.toUpperCase()) {
        case 'DELIVRD':
        case 'ANSWERED':
            return 'bg-green-600 hover:bg-green-700';
        case 'SENT':
        case 'ACCEPTD':
        case 'WAITING':
            return 'bg-blue-500 hover:bg-blue-600';
        case 'UNDELIV':
        case 'FAILED':
        case 'REJECTD':
            return 'bg-red-600 hover:bg-red-700';
        case 'EXPIRED':
        case 'DELETED':
        case 'UNKNOWN':
            return 'bg-gray-500 hover:bg-gray-600';
        default:
            return 'bg-gray-500 hover:bg-gray-600';
    }
}


export const columns: ColumnDef<Message>[] = [
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
        accessorKey: "sentDate",
        header: "Date",
        cell: ({ row }) => {
            const date = row.getValue("sentDate") as string;
            return date ? format(new Date(date), 'PPP p') : 'N/A';
        }
    },
    {
        accessorKey: "recipient",
        header: "Recipient",
    },
    {
        accessorKey: "content",
        header: "Message",
        cell: ({ row }) => {
            const content = row.getValue("content") as string;
            return <p className="truncate max-w-sm">{content}</p>
        }
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const message = row.original;
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge className={cn("capitalize text-white", getStatusVariant(message.status))}>
                                {message.status}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 text-xs">
                                <span className="font-semibold">Reason:</span><span>{message.reason || 'N/A'}</span>
                                <span className="font-semibold">Destination:</span><span>{message.recipient}</span>
                                <span className="font-semibold">Handle Charge:</span><span>{message.handleCharge ?? 'N/A'}</span>
                                <span className="font-semibold">Topup Charge:</span><span>{message.topupCharge ?? 'N/A'}</span>
                                <span className="font-semibold">Last Update:</span><span>{message.statusDate ? format(new Date(message.statusDate), 'PP p') : 'N/A'}</span>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        }
    }
]
