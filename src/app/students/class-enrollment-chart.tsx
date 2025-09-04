
'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { Student } from "@/types"

type ClassEnrollmentChartProps = {
  data: Student[];
};

export default function ClassEnrollmentChart({ data }: ClassEnrollmentChartProps) {
  const classEnrollment = data.reduce((acc, student) => {
    const existingClass = acc.find(c => c.name === student.class);
    if (existingClass) {
        existingClass.students += 1;
    } else if (student.class) {
        acc.push({ name: student.class, students: 1 });
    }
    return acc;
  }, [] as { name: string; students: number }[]).sort((a, b) => {
    const gradeA = parseInt(a.name.split(' ')[1]);
    const gradeB = parseInt(b.name.split(' ')[1]);
    return gradeA - gradeB;
  });

  return (
    <Card>
        <CardHeader>
            <CardTitle>Class Enrollment</CardTitle>
            <CardDescription>Distribution of students across all classes.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={{}} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classEnrollment} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                    allowDecimals={false}
                />
                <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={<ChartTooltipContent />}
                />
                <Bar dataKey="students" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
            </ChartContainer>
        </CardContent>
    </Card>
  )
}
