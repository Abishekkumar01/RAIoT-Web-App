"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { db } from "@/lib/firebase"
import { writeBatch, doc } from "firebase/firestore"
import { toast } from "sonner"
import { Loader2, Upload } from "lucide-react"

export function StudentImporter() {
    const [csvData, setCsvData] = useState("")
    const [importing, setImporting] = useState(false)

    const handleImport = async () => {
        if (!csvData.trim()) return

        try {
            setImporting(true)
            const rows = csvData.trim().split('\n')
            const batch = writeBatch(db)
            let count = 0

            // Assume simple CSV: UniqueID,Name,Batch
            // Skip header if present (heuristic: check if first row has "Name" or "ID")
            const startIdx = rows[0].toLowerCase().includes('name') ? 1 : 0

            for (let i = startIdx; i < rows.length; i++) {
                const row = rows[i].trim()
                if (!row) continue

                const parts = row.split(',')
                if (parts.length < 2) continue

                const uniqueId = parts[0].trim()
                const name = parts[1].trim()
                const batchName = parts[2]?.trim() || 'General'

                if (!uniqueId || !name) continue

                const ref = doc(db, "students", uniqueId)
                batch.set(ref, {
                    uniqueId,
                    name,
                    batch: batchName,
                    active: true
                })
                count++
            }

            await batch.commit()
            toast.success(`Successfully imported ${count} students.`)
            setCsvData("")
        } catch (error) {
            console.error("Import error:", error)
            toast.error("Failed to import students.")
        } finally {
            setImporting(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md text-sm">
                <p className="font-medium mb-2">CSV Format Instructions:</p>
                <p>Paste your student list below in the following format (no header needed, or header ignored):</p>
                <code className="block bg-black/10 p-2 rounded mt-2">
                    RAIOT001, John Doe, Batch A<br />
                    RAIOT002, Jane Smith, Batch B
                </code>
            </div>
            <Textarea
                placeholder="Paste CSV data here..."
                rows={10}
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                className="font-mono"
            />
            <Button onClick={handleImport} disabled={importing || !csvData.trim()}>
                {importing ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                    </>
                ) : (
                    <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import Students
                    </>
                )}
            </Button>
        </div>
    )
}
