'use client'

import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ActivityLog } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "activity-log"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const logsData: ActivityLog[] = [];
      querySnapshot.forEach((doc) => {
        logsData.push({ id: doc.id, ...doc.data() } as ActivityLog);
      });
      setLogs(logsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching activity logs:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch activity logs." });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const filteredLogs = logs.filter(log =>
    log.user.name.toLowerCase().includes(filter.toLowerCase()) ||
    log.user.email.toLowerCase().includes(filter.toLowerCase()) ||
    log.action.toLowerCase().includes(filter.toLowerCase()) ||
    log.details.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Activity Log"
        description="A chronological record of all significant actions taken in the system."
      />

      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>System Log</CardTitle>
                    <CardDescription>Browse all recorded user activities.</CardDescription>
                </div>
                <Input
                    placeholder="Filter logs..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="max-w-sm"
                />
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                        ) : filteredLogs.length > 0 ? (
                            filteredLogs.map(log => (
                                <TableRow key={log.id}>
                                    <TableCell>{format(new Date(log.timestamp), 'PPP p')}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                             <Avatar className="h-8 w-8">
                                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${log.user.name}`} />
                                                <AvatarFallback>{log.user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{log.user.name}</p>
                                                <p className="text-xs text-muted-foreground">{log.user.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant="secondary">{log.action}</Badge></TableCell>
                                    <TableCell>{log.details}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center">No activity logs found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </>
  );
}
