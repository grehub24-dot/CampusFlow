
"use client"

import * as React from "react"
import { Pie, PieChart, ResponsiveContainer, Cell, Legend } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { CardDescription } from "../ui/card"

type GenderRatioPieChartProps = {
  data: {
    male: number,
    female: number,
  }
}

export default function GenderRatioPieChart({ data }: GenderRatioPieChartProps) {
  const chartData = [
    { name: "Male", value: data.male, fill: "hsl(var(--chart-1))" },
    { name: "Female", value: data.female, fill: "hsl(var(--chart-2))" },
  ]

  const chartConfig = {
    male: {
      label: "Male",
      color: "hsl(var(--chart-1))",
    },
    female: {
      label: "Female",
      color: "hsl(var(--chart-2))",
    },
  }

  const total = data.male + data.female;

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={60}
            paddingAngle={5}
            labelLine={false}
            label={({
              cx,
              cy,
              midAngle,
              innerRadius,
              outerRadius,
              percent,
              index,
            }) => {
              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
              const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
              const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

              return (
                <text
                  x={x}
                  y={y}
                  fill="white"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-sm font-medium"
                >
                  {`${(percent * 100).toFixed(0)}%`}
                </text>
              );
            }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
           <ChartLegend
            content={<ChartLegendContent nameKey="name" />}
            className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
          />
           <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-2xl font-bold"
            >
              {total.toLocaleString()}
            </text>
            <text
              x="50%"
              y="50%"
              dy="1.5em"
              textAnchor="middle"
              className="fill-muted-foreground text-sm"
            >
              Total
            </text>
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
