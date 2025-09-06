
'use client'

import React from 'react';
import type { Message } from '@/types';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


type MessageHistoryProps = {
  messages: Message[];
}

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

export function MessageHistory({ messages }: MessageHistoryProps) {
    if (messages.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Message History</CardTitle>
                    <CardDescription>A log of all communications sent from the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-12">
                        No messages have been sent yet.
                    </p>
                </CardContent>
            </Card>
        )
    }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Message History</CardTitle>
            <CardDescription>A log of all communications sent from the system.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TooltipProvider>
                            {messages.map(message => (
                                <TableRow key={message.id}>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {format(new Date(message.sentDate), 'PPP p')}
                                    </TableCell>
                                    <TableCell>{message.recipient}</TableCell>
                                    <TableCell>
                                        <p className="truncate max-w-sm">{message.content}</p>
                                    </TableCell>
                                    <TableCell>
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
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TooltipProvider>
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
  )
}
