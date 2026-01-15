"use client"

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface AttendanceChartProps {
    present: number
    late: number
    absent: number
    total: number
}

export function AttendanceChart({ present, late, absent, total }: AttendanceChartProps) {
    const data = [
        { name: "Present", value: present, color: "#22c55e" }, // green-500
        { name: "Late", value: late, color: "#f97316" },    // orange-500
        { name: "Absent", value: absent, color: "#ef4444" },   // red-500
    ]

    // Filter out zero values for the chart segments to avoid weird rendering if needed, 
    // but Recharts handles 0 fine usually.
    const activeData = data.filter(d => d.value > 0)

    // Calculate attended count (Present + Late)
    const attendedCount = present + late

    // If no data at all, show a gray ring
    if (total === 0) {
        activeData.push({ name: "Empty", value: 1, color: "#e5e7eb" })
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                    {/* Donut Chart Section */}
                    <div className="relative w-64 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={total === 0 ? [{ value: 1 }] : data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    {/* If total is 0, render gray placeholder */}
                                    {total === 0 ? (
                                        <Cell key="empty" fill="#e5e7eb" />
                                    ) : (
                                        data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))
                                    )}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-bold text-slate-700 dark:text-slate-200">
                                {attendedCount}<span className="text-slate-400 font-normal">/{total}</span>
                            </span>
                            <span className="text-sm text-muted-foreground font-medium mt-1">Classes</span>
                        </div>
                    </div>

                    {/* Legend / Stats Section */}
                    <div className="w-full max-w-sm space-y-6">
                        {/* Present */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-green-500 font-medium">Present</span>
                                <span className="text-slate-600 dark:text-slate-400">{present}</span>
                            </div>
                            <Progress
                                value={total > 0 ? (present / total) * 100 : 0}
                                className="h-2 bg-green-100 dark:bg-green-950/30"
                                indicatorClassName="bg-green-500"
                            />
                        </div>

                        {/* Late */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-orange-500 font-medium">Late</span>
                                <span className="text-slate-600 dark:text-slate-400">{late}</span>
                            </div>
                            <Progress
                                value={total > 0 ? (late / total) * 100 : 0}
                                className="h-2 bg-orange-100 dark:bg-orange-950/30"
                                indicatorClassName="bg-orange-500"
                            />
                        </div>

                        {/* Absent */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-red-500 font-medium">Absent</span>
                                <span className="text-slate-600 dark:text-slate-400">{absent}</span>
                            </div>
                            <Progress
                                value={total > 0 ? (absent / total) * 100 : 0}
                                className="h-2 bg-red-100 dark:bg-red-950/30"
                                indicatorClassName="bg-red-500"
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
