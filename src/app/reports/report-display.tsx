'use client'

import React from 'react';
import type { GenerateInsightfulReportsOutput } from '@/ai/flows/generate-insightful-reports';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BrainCircuit } from 'lucide-react';

interface ReportDisplayProps {
  report: GenerateInsightfulReportsOutput | null;
  isLoading: boolean;
}

const TextReport: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n').map((line, idx) => {
    if (line.startsWith('# ')) return <h1 key={idx} className="text-2xl font-bold mt-6 mb-2">{line.replace('# ', '')}</h1>;
    if (line.startsWith('## ')) return <h2 key={idx} className="text-xl font-semibold mt-4 mb-1">{line.replace('## ', '')}</h2>;
    if (line.startsWith('### ')) return <h3 key={idx} className="text-lg font-medium mt-3 mb-1">{line.replace('### ', '')}</h3>;
    if (line.startsWith('- ')) return <li key={idx} className="ml-6 list-disc">{line.replace('- ', '')}</li>;
    if (line.trim() === '') return <div key={idx} className="h-4" />;
    return <p key={idx} className="mb-2 leading-relaxed whitespace-pre-wrap font-mono text-sm">{line}</p>;
  });

  return <div className="prose max-w-none">{lines}</div>;
};

export const ReportDisplay: React.FC<ReportDisplayProps> = ({ report, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-40 w-full" />
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Report</CardTitle>
        <CardDescription>
          Using template: <span className="font-semibold capitalize">{report.reportFormat}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TextReport content={report.reportContent} />
      </CardContent>
    </Card>
  );
};
