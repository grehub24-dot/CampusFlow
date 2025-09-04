
'use client'

import React from 'react';
import type { GenerateInsightfulReportsOutput } from '@/ai/flows/generate-insightful-reports';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BrainCircuit } from 'lucide-react';

interface ReportDisplayProps {
  report: GenerateInsightfulReportsOutput | null;
  isLoading: boolean;
}

const parseCsv = (csvString: string) => {
    const rows = csvString.trim().split('\n');
    return rows.map(row => row.split(','));
};

const CsvReport: React.FC<{ content: string }> = ({ content }) => {
    const data = parseCsv(content);
    if (data.length === 0) return <p>No data in CSV.</p>;

    const header = data[0];
    const body = data.slice(1);

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        {header.map((col, index) => <TableHead key={index}>{col}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {body.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell}</TableCell>)}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

const ChartReport: React.FC<{ content: string }> = ({ content }) => {
    try {
        const data = JSON.parse(content);
        if (!Array.isArray(data) || data.length === 0) return <p>Invalid chart data.</p>;
        
        const keys = Object.keys(data[0]).filter(k => k !== 'name');

        return (
             <ChartContainer config={{}} className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                        <Legend />
                        {keys.map((key, index) => (
                            <Bar key={key} dataKey={key} fill={`hsl(var(--chart-${index + 1}))`} radius={[4, 4, 0, 0]} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
        )
    } catch (e) {
        return <p>Could not parse chart data. Displaying raw content: <pre className="whitespace-pre-wrap">{content}</pre></p>
    }
}

const TextReport: React.FC<{ content: string }> = ({ content }) => {
    return <pre className="whitespace-pre-wrap font-sans text-sm">{content}</pre>
}

export const ReportDisplay: React.FC<ReportDisplayProps> = ({ report, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
        <Card className="flex flex-col items-center justify-center h-full min-h-[300px] text-center border-dashed">
            <CardHeader>
                <div className="mx-auto bg-muted rounded-full p-3">
                    <BrainCircuit className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">Your Report Will Appear Here</CardTitle>
                <CardDescription>Fill out the form to generate a new report.</CardDescription>
            </CardHeader>
        </Card>
    );
  }
  
  const renderContent = () => {
    const format = report.reportFormat.toLowerCase();
    if (format.includes('csv')) {
        return <CsvReport content={report.reportContent} />;
    }
    if (format.includes('chart')) {
        return <ChartReport content={report.reportContent} />;
    }
    return <TextReport content={report.reportContent} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Report</CardTitle>
        <CardDescription>Format: <span className="font-semibold capitalize">{report.reportFormat}</span></CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};
