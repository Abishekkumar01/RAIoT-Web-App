'use client'

import { StudentImporter } from '@/components/admin/StudentImporter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function StudentDataPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Manage Student Data</h2>
                <p className="text-muted-foreground">
                    Import and manage the master student list for attendance.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Bulk Import Students</CardTitle>
                </CardHeader>
                <CardContent>
                    <StudentImporter />
                </CardContent>
            </Card>
        </div>
    )
}
