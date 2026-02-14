import { getDatabaseStats } from '@/app/actions/storageActions';

// ... (existing imports)

export function AttendanceMarker() {
    const { user } = useAuth()
    // ... (existing state)

    // Storage Stats State
    const [storageStats, setStorageStats] = useState({
        usagePercentage: 0,
        estimatedBytes: 0,
        maxBytes: 512 * 1024 * 1024 // 512MB
    });

    // ... (existing useEffects)

    // Fetch Storage Stats
    useEffect(() => {
        const fetchStats = async () => {
            const stats = await getDatabaseStats();
            if (stats.success && stats.data) {
                setStorageStats({
                    usagePercentage: parseFloat(stats.data.usagePercentage),
                    estimatedBytes: stats.data.estimatedBytes,
                    maxBytes: stats.data.maxBytes
                });
            }
        };
        fetchStats();
    }, [date, submitting]); // Refresh when date changes or after submit

    // ... (existing handlers)

    // MODIFIED EXPORT FUNCTION (No Clear)
    const handleExportOnly = async () => {
        try {
            const result = await getAllAttendanceRecords();
            if (!result.success || !result.data || result.data.length === 0) {
                toast.error("No attendance data found to export.");
                return;
            }

            const ws = XLSX.utils.json_to_sheet(result.data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Attendance_Report");
            const fileName = `Attendance_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast.success("Export successful!");

            // NO CLEAR DIALOG HERE
        } catch (error: any) {
            console.error("Export error:", error);
            toast.error("Export failed: " + error.message);
        }
    }

    // Format bytes helper
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">

            {/* STORAGE BAR (Windows Style) */}
            <div className="bg-card border rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Database Storage (Estimated)
                    </h3>
                    <span className="text-xs font-mono text-muted-foreground">
                        {formatBytes(storageStats.estimatedBytes)} used of {formatBytes(storageStats.maxBytes)}
                    </span>
                </div>
                <div className="h-4 w-full bg-secondary rounded-full overflow-hidden border border-secondary">
                    <div
                        className={cn(
                            "h-full transition-all duration-500",
                            storageStats.usagePercentage > 90 ? "bg-red-500" :
                                storageStats.usagePercentage > 70 ? "bg-yellow-500" : "bg-blue-600"
                        )}
                        style={{ width: `${Math.max(storageStats.usagePercentage, 1)}%` }} // Min 1% visibility
                    />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                    ~{storageStats.usagePercentage.toFixed(4)}% Used (Free Tier Limit)
                </p>
            </div>

            {/* Top Bar with Export */}
            <div className="flex justify-end mb-4 gap-2">
                {/* RESTRICTED TEST BUTTON */}
                {user?.email === 'raj.r@raiot.site' && (
                    <Button
                        variant="outline"
                        className="gap-2 border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-600"
                        onClick={async () => {
                            toast.info("Testing connection...");
                            try {
                                const result = await testConnection();
                                if (result.success) {
                                    toast.success(result.message);
                                } else {
                                    alert(`CONNECTION FAILED:\n\n${result.error}\n\nCheck Vercel Environment Variables.`);
                                    console.error(result);
                                }
                            } catch (err: any) {
                                alert(`CRITICAL FAILURE:\n\n${err.message}`);
                            }
                        }}
                    >
                        <Database className="h-4 w-4" />
                        Test Connection
                    </Button>
                )}

                <Button
                    variant="outline"
                    className="gap-2 border-primary/20 hover:bg-primary/10"
                    onClick={handleExportOnly}
                >
                    <Download className="h-4 w-4" />
                    Export All Data
                </Button>
            </div>

            {/* ... rest of the component ... */}

            {/* List */}
            {students.length > 0 && (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">S.No</TableHead>
                                <TableHead className="w-[50px]">Status</TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Attendance %</TableHead>
                                <TableHead>Batch</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        No matching students found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStudents.map((student, index) => (
                                    <TableRow key={student.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                        <TableCell className="min-w-[280px]">
                                            <RadioGroup
                                                value={attendanceState[student.id] || 'present'}
                                                onValueChange={(val) => handleStatusChange(student.id, val as any)}
                                                className="flex items-center space-x-3"
                                                disabled={isHoliday}
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <RadioGroupItem value="present" id={`p-${student.id}`} className="text-green-600 border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:text-white" />
                                                    <Label htmlFor={`p-${student.id}`} className="text-xs text-green-700 font-medium cursor-pointer">P</Label>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <RadioGroupItem value="late" id={`l-${student.id}`} className="text-orange-500 border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white" />
                                                    <Label htmlFor={`l-${student.id}`} className="text-xs text-orange-600 font-medium cursor-pointer">L</Label>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <RadioGroupItem value="leave" id={`le-${student.id}`} className="text-purple-500 border-purple-500 data-[state=checked]:bg-purple-500 data-[state=checked]:text-white" />
                                                    <Label htmlFor={`le-${student.id}`} className="text-xs text-purple-600 font-medium cursor-pointer">Leave</Label>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <RadioGroupItem value="absent" id={`a-${student.id}`} className="text-red-500 border-red-500 data-[state=checked]:bg-red-500 data-[state=checked]:text-white" />
                                                    <Label htmlFor={`a-${student.id}`} className="text-xs text-red-600 font-medium cursor-pointer">A</Label>
                                                </div>
                                            </RadioGroup>
                                        </TableCell>
                                        <TableCell className="font-medium text-xs">{student.uniqueId}</TableCell>
                                        <TableCell className="text-sm font-medium">{student.name}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "font-bold text-xs px-2 py-0.5 rounded",
                                                        "bg-gray-100 text-gray-500" // Reset styles as % is not calculated yet
                                                    )}>
                                                        N/A
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{student.batch || '-'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="flex justify-between items-center">
                <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={loading || submitting || students.length === 0}
                >
                    {submitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                        </>
                    ) : existingAttendance ? (
                        <>
                            <Check className="mr-2 h-4 w-4" />
                            Update Attendance
                        </>
                    ) : (
                        "Submit Attendance"
                    )}
                </Button>
            </div>
        </div>
    )
}
