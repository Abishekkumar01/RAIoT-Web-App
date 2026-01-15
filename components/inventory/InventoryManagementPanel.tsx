"use client"

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
    getInventory,
    getAllIssuances,
    getDamagedLogs,
    addComponent,
    updateIssuanceStatus,
    reportDamage,
    getBills,
    addBill,
    deleteBill
} from '@/lib/inventory';
import { IComponent, IIssuance, IDamagedLog, IBill } from '@/types/inventory';
import { Loader2, Database, Plus, ClipboardList, LogOut, Upload, Download, Search, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ImageUpload from '@/components/ui/ImageUpload';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComponentDetailsModal } from '@/components/inventory/ComponentDetailsModal';
import BillUpload from '@/components/inventory/bill-upload';

// --- Types ---

interface InventoryViewProps {
    inventory: IComponent[];
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    loading: boolean;
    setSelectedComponent: (item: IComponent) => void;
    setReportDamageItem: (item: IComponent) => void;
    handleExportExcel: () => void;
    handleDownloadTemplate: () => void;
    handleImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface AddComponentViewProps {
    newItem: any;
    setNewItem: (item: any) => void;
    handleAddItem: (e: React.FormEvent) => void;
}

interface IssuedViewProps {
    issuances: IIssuance[];
    handleRequestAction: (id: string, status: 'approved' | 'rejected' | 'returned') => void;
}

interface DamagedViewProps {
    damagedLogs: IDamagedLog[];
}

interface InventoryManagementPanelProps {
    title?: string;
}

// --- Sub-Components (Defined OUTSIDE main component to fix focus issues) ---

const InventoryView = ({
    inventory,
    searchTerm,
    setSearchTerm,
    loading,
    setSelectedComponent,
    setReportDamageItem,
    handleExportExcel,
    handleDownloadTemplate,
    handleImportExcel
}: InventoryViewProps) => (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search inventory..."
                    className="pl-8 bg-neutral-900 border-neutral-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2">
                <Button variant="outline" className="text-green-500 border-green-900/50 hover:bg-green-900/10" onClick={handleExportExcel}>
                    <Download className="mr-2 h-4 w-4" /> Download Excel
                </Button>
                <Button variant="outline" className="text-gray-400 border-gray-800 hover:bg-white/5" onClick={handleDownloadTemplate}>
                    Template
                </Button>
                <div className="relative">
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleImportExcel}
                    />
                    <Button variant="outline" className="text-blue-500 border-blue-900/50 hover:bg-blue-900/10 pointer-events-none">
                        <Upload className="mr-2 h-4 w-4" /> Upload Excel
                    </Button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {inventory
                .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(item => (
                    <div
                        key={item.id}
                        className="group bg-neutral-900 rounded-xl border border-neutral-800 p-4 transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer flex flex-col"
                        onClick={() => setSelectedComponent(item)}
                    >
                        <div className="relative aspect-square mb-4 rounded-lg overflow-hidden bg-black/50">
                            <img
                                src={item.imageUrl || "https://via.placeholder.com/150"}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-white mb-1 truncate">{item.name}</h3>
                            <div className="flex justify-between text-sm text-gray-400 mb-2">
                                <span>Qty: {item.quantity}</span>
                                <span className={item.availableQuantity === 0 ? "text-red-500" : "text-green-500"}>
                                    Avail: {item.availableQuantity}
                                </span>
                            </div>
                            <p className="text-xs text-purple-400 mb-4">{item.type}</p>
                        </div>
                        <Button
                            variant="destructive"
                            className="w-full bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                            onClick={(e) => {
                                e.stopPropagation();
                                setReportDamageItem(item);
                            }}
                        >
                            Report Damage
                        </Button>
                    </div>
                ))}
            {inventory.length === 0 && !loading && (
                <div className="col-span-full text-center py-20 text-gray-500">
                    No components found.
                </div>
            )}
        </div>
    </div>
);

const AddComponentView = ({ newItem, setNewItem, handleAddItem }: AddComponentViewProps) => {
    const COMPONENT_TYPES = [
        "Microcontroller", "Microprocessor", "Sensor", "Camera", "Microphone", "Biometric Reader",
        "Actuator", "Servo Motor", "Stepper Motor", "Relay", "Buzzer", "Speaker", "LED",
        "OLED", "QLED", "GPS Module", "Battery", "Power Supply", "Voltage Regulator", "Charger",
        "Display", "Switch", "Button", "IC (Integrated Circuit)", "Wire", "Connector",
        "Prototyping base", "Chassis", "Measurement Instrument", "Stationary", "Memory", "Storage Device"
    ];

    return (
        <div className="max-w-2xl mx-auto bg-neutral-900 p-8 rounded-xl border border-neutral-800">
            <h2 className="text-2xl font-bold mb-6 text-white">Add New Component</h2>
            <form onSubmit={handleAddItem} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Component Name</label>
                        <Input
                            value={newItem.name}
                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                            className="bg-neutral-950 border-neutral-800"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Initial Quantity</label>
                        <Input
                            type="number"
                            value={newItem.quantity}
                            onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                            className="bg-neutral-950 border-neutral-800"
                            min="0"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Type</label>
                    <Select
                        value={newItem.type}
                        onValueChange={(val) => setNewItem({ ...newItem, type: val })}
                    >
                        <SelectTrigger className="bg-neutral-950 border-neutral-800">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-800">
                            {COMPONENT_TYPES.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Image</label>
                    <div className="flex justify-center p-4 bg-neutral-950 rounded-lg border border-neutral-800 border-dashed">
                        <ImageUpload
                            value={newItem.imageUrl}
                            onChange={(url) => setNewItem({ ...newItem, imageUrl: url })}
                            onRemove={() => setNewItem({ ...newItem, imageUrl: '' })}
                        />
                    </div>
                </div>

                <div className="space-y-2 relative z-0">
                    <label className="text-sm font-medium text-gray-400">Description</label>
                    <Textarea
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        className="bg-neutral-950 border-neutral-800 min-h-[100px] relative z-10"
                        placeholder="Enter component details..."
                        rows={4}
                    />
                </div>

                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 text-lg">
                    Add Component
                </Button>
            </form>
        </div>
    );
};

const IssuedView = ({ issuances, handleRequestAction }: IssuedViewProps) => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Issued Components</h2>
        <div className="rounded-xl border border-neutral-800 overflow-hidden">
            <Table>
                <TableHeader className="bg-neutral-900">
                    <TableRow className="border-neutral-800 hover:bg-neutral-900">
                        <TableHead className="text-gray-400">Member</TableHead>
                        <TableHead className="text-gray-400">Component</TableHead>
                        <TableHead className="text-gray-400">Issued</TableHead>
                        <TableHead className="text-gray-400">Return Date</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="bg-neutral-950/50">
                    {issuances.map(issuance => (
                        <TableRow key={issuance.id} className="border-neutral-800 hover:bg-neutral-900/50">
                            <TableCell className="font-medium text-white">
                                {issuance.userName}
                                <div className="text-xs text-gray-500">{issuance.userEmail}</div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded bg-neutral-800 overflow-hidden">
                                        <img src={issuance.componentImage || "https://via.placeholder.com/150"} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-300">{issuance.componentName}</div>
                                        <div className="text-xs text-gray-500">Qty: {issuance.quantity}</div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-gray-400">{new Date(issuance.issueDate).toLocaleDateString()}</TableCell>
                            <TableCell className="text-gray-400">{new Date(issuance.dueDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                                <Badge variant={
                                    issuance.status === 'issued' || issuance.status === 'approved' ? 'default' :
                                        issuance.status === 'pending' ? 'secondary' :
                                            issuance.status === 'rejected' ? 'destructive' : 'outline'
                                } className={
                                    (issuance.status === 'issued' || issuance.status === 'approved') ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' :
                                        issuance.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30' :
                                            issuance.status === 'rejected' ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : ''
                                }>
                                    {issuance.status.toUpperCase()}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {issuance.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <Button size="sm" className="bg-green-600/20 text-green-400 hover:bg-green-600/30" onClick={() => handleRequestAction(issuance.id!, 'approved')}>Approve</Button>
                                        <Button size="sm" className="bg-red-600/20 text-red-400 hover:bg-red-600/30" onClick={() => handleRequestAction(issuance.id!, 'rejected')}>Reject</Button>
                                    </div>
                                )}
                                {(issuance.status === 'issued' || issuance.status === 'approved') && (
                                    <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10" onClick={() => handleRequestAction(issuance.id!, 'returned')}>
                                        Mark Returned
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    </div>
);

const DamagedView = ({ damagedLogs }: DamagedViewProps) => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-red-400">Damaged Items Log</h2>
        <div className="rounded-xl border border-neutral-800 overflow-hidden">
            <Table>
                <TableHeader className="bg-neutral-900">
                    <TableRow className="border-neutral-800 hover:bg-neutral-900">
                        <TableHead className="text-gray-400">Component</TableHead>
                        <TableHead className="text-gray-400">Quantity</TableHead>
                        <TableHead className="text-gray-400">Reason</TableHead>
                        <TableHead className="text-gray-400">Reported By</TableHead>
                        <TableHead className="text-gray-400">Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="bg-neutral-950/50">
                    {damagedLogs.map(log => (
                        <TableRow key={log.id} className="border-neutral-800 hover:bg-neutral-900/50">
                            <TableCell className="font-bold text-gray-300">{log.componentName}</TableCell>
                            <TableCell className="text-red-400 font-mono">-{log.quantity}</TableCell>
                            <TableCell className="text-gray-400">{log.reason}</TableCell>
                            <TableCell className="text-gray-500">{log.reportedBy}</TableCell>
                            <TableCell className="text-gray-500">{new Date(log.date).toLocaleDateString()}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    </div>
);

const SidebarItem = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
    >
        {icon}
        <span className="font-medium">{label}</span>
    </button>
);

// --- Main Page Component ---

export default function InventoryManagementPanel({ title = "Admin Panel" }: InventoryManagementPanelProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'inventory' | 'addComponent' | 'issued' | 'damaged' | 'bills'>('inventory');
    const [loading, setLoading] = useState(false);

    // Data States
    const [inventory, setInventory] = useState<IComponent[]>([]);
    const [issuances, setIssuances] = useState<IIssuance[]>([]);
    const [damagedLogs, setDamagedLogs] = useState<IDamagedLog[]>([]);
    const [bills, setBills] = useState<IBill[]>([]);

    // Local UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedComponent, setSelectedComponent] = useState<IComponent | null>(null);
    const [reportDamageItem, setReportDamageItem] = useState<IComponent | null>(null);

    // Form States for Damage Report
    const [damageQty, setDamageQty] = useState(1);
    const [damageReason, setDamageReason] = useState('');

    // Form States for Add Component
    const [newItem, setNewItem] = useState({
        name: '',
        quantity: 0,
        type: 'Sensor',
        description: '',
        imageUrl: ''
    });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'inventory') {
                const data = await getInventory();
                setInventory(data);
            } else if (activeTab === 'issued') {
                const data = await getAllIssuances();
                setIssuances(data);
            } else if (activeTab === 'damaged') {
                const data = await getDamagedLogs();
                setDamagedLogs(data);
            } else if (activeTab === 'bills') {
                const data = await getBills();
                setBills(data);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!newItem.name || newItem.quantity < 0) return toast.error("Invalid details");

            await addComponent({
                ...newItem,
                availableQuantity: newItem.quantity,
                imageUrl: newItem.imageUrl || "https://via.placeholder.com/150",
            });
            toast.success("Component Added Successfully");
            setNewItem({ name: '', quantity: 0, type: 'Sensor', description: '', imageUrl: '' });
            setActiveTab('inventory');
        } catch (error) {
            console.error(error);
            toast.error("Failed to add component");
        }
    };

    const handleReportDamage = async () => {
        if (!reportDamageItem || damageQty <= 0 || !damageReason) return;
        try {
            await reportDamage(
                reportDamageItem.id,
                damageQty,
                damageReason,
                user?.displayName || 'Admin'
            );
            toast.success("Damage Reported");
            setReportDamageItem(null);
            setDamageQty(1);
            setDamageReason('');
            fetchData(); // Refresh inventory
        } catch (error) {
            console.error(error);
            toast.error("Failed to report damage");
        }
    };

    const handleRequestAction = async (id: string, status: 'approved' | 'rejected' | 'returned') => {
        try {
            await updateIssuanceStatus(id, status);
            toast.success(`Request ${status}`);
            fetchData();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleBillUploadComplete = async (url: string, fileName: string) => {
        try {
            await addBill({
                url,
                fileName,
                uploadedBy: user?.displayName || 'Admin'
            });
            toast.success("Bill saved to records");
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save bill record");
            throw error; // Re-throw to notify child component
        }
    };

    const handleDeleteBill = async (id: string) => {
        try {
            if (!confirm("Are you sure you want to delete this bill?")) return;
            await deleteBill(id);
            toast.success("Bill deleted");
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete bill");
        }
    };

    const handleExportExcel = () => {
        try {
            import('xlsx').then(xlsx => {
                const worksheet = xlsx.utils.json_to_sheet(inventory.map(item => ({
                    Name: item.name,
                    Quantity: item.quantity,
                    Available: item.availableQuantity,
                    Type: item.type,
                    "Image URL": item.imageUrl,
                    "Created At": new Date(item.createdAt).toISOString()
                })));
                const workbook = xlsx.utils.book_new();
                xlsx.utils.book_append_sheet(workbook, worksheet, "Inventory");
                xlsx.writeFile(workbook, "Inventory_Data.xlsx");
                toast.success("Excel downloaded successfully");
            });
        } catch (error) {
            console.error(error);
            toast.error("Failed to download Excel");
        }
    };

    const handleDownloadTemplate = () => {
        import('xlsx').then(xlsx => {
            const worksheet = xlsx.utils.json_to_sheet([{
                Name: "Example Component",
                Quantity: 10,
                Type: "Sensor",
                Description: "Description here",
                Image: "https://example.com/image.jpg"
            }]);
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, "Template");
            xlsx.writeFile(workbook, "Inventory_Upload_Template.xlsx");
        });
    };

    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        import('xlsx').then(xlsx => {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = xlsx.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = xlsx.utils.sheet_to_json(ws) as any[];

                    let addedCount = 0;
                    for (const row of data) {
                        if (row.Name && row.Quantity) {
                            await addComponent({
                                name: row.Name,
                                quantity: Number(row.Quantity),
                                type: row.Type || 'Sensor',
                                description: row.Description || '',
                                imageUrl: row["Image URL"] || row.Image || "https://via.placeholder.com/150",
                                availableQuantity: Number(row.Quantity)
                            });
                            addedCount++;
                        }
                    }
                    toast.success(`Imported ${addedCount} components`);
                    fetchData();
                } catch (error) {
                    console.error(error);
                    toast.error("Failed to parse Excel file");
                }
            };
            reader.readAsBinaryString(file);
        });
    };


    return (
        <div className="flex h-[calc(100vh-4rem)] -m-6 bg-black">
            {/* Sidebar */}
            <div className="w-64 bg-neutral-900/50 border-r border-neutral-800 p-4 flex flex-col gap-2">
                <div className="mb-6 px-2">
                    <h2 className="text-2xl font-bold text-purple-400">{title}</h2>
                </div>

                <SidebarItem
                    active={activeTab === 'inventory'}
                    onClick={() => setActiveTab('inventory')}
                    icon={<Database size={20} />}
                    label="Inventory"
                />
                <SidebarItem
                    active={activeTab === 'addComponent'}
                    onClick={() => setActiveTab('addComponent')}
                    icon={<Plus size={20} />}
                    label="Add Component"
                />
                <SidebarItem
                    active={activeTab === 'issued'}
                    onClick={() => setActiveTab('issued')}
                    icon={<ClipboardList size={20} />}
                    label="Issued Components"
                />
                <SidebarItem
                    active={activeTab === 'damaged'}
                    onClick={() => setActiveTab('damaged')}
                    icon={<LogOut size={20} />}
                    label="Damaged Items"
                />
                <SidebarItem
                    active={activeTab === 'bills'}
                    onClick={() => setActiveTab('bills')}
                    icon={<FileText size={20} />}
                    label="Bills"
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                    </div>
                ) : (
                    <>
                        {activeTab === 'inventory' && (
                            <InventoryView
                                inventory={inventory}
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                loading={loading}
                                setSelectedComponent={setSelectedComponent}
                                setReportDamageItem={setReportDamageItem}
                                handleExportExcel={handleExportExcel}
                                handleDownloadTemplate={handleDownloadTemplate}
                                handleImportExcel={handleImportExcel}
                            />
                        )}
                        {activeTab === 'addComponent' && (
                            <AddComponentView
                                newItem={newItem}
                                setNewItem={setNewItem}
                                handleAddItem={handleAddItem}
                            />
                        )}
                        {activeTab === 'issued' && (
                            <IssuedView
                                issuances={issuances}
                                handleRequestAction={handleRequestAction}
                            />
                        )}
                        {activeTab === 'damaged' && (
                            <DamagedView damagedLogs={damagedLogs} />
                        )}
                        {activeTab === 'bills' && (
                            <div className="flex flex-col h-full space-y-6">
                                <div className="text-left space-y-2 mb-4">
                                    <h2 className="text-3xl font-bold text-white tracking-tight">Inventory Bills</h2>
                                    <p className="text-gray-400">Upload and store purchase bills for inventory auditing.</p>
                                </div>

                                <div className="flex flex-col lg:flex-row gap-8 h-full">
                                    {/* Left Column: Upload (Fixed/Sticky behavior on large screens if needed, or just static) */}
                                    <div className="w-full lg:w-1/3 shrink-0">
                                        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6 sticky top-0">
                                            <h3 className="text-lg font-semibold text-white mb-4">Upload New Bill</h3>
                                            <BillUpload onUploadComplete={handleBillUploadComplete} />
                                        </div>
                                    </div>

                                    {/* Right Column: List */}
                                    <div className="w-full lg:w-2/3">
                                        <h3 className="text-lg font-semibold text-white mb-4">Uploaded Bills ({bills.length})</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {bills.map(bill => (
                                                <div key={bill.id} className="bg-neutral-900 rounded-xl border border-neutral-800 p-4 flex flex-col gap-3 group hover:border-neutral-700 transition-colors">
                                                    <div className="aspect-video bg-neutral-950 rounded-lg overflow-hidden relative border border-neutral-800">
                                                        {bill.url.includes('.pdf') ? (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                                <FileText size={48} />
                                                            </div>
                                                        ) : (
                                                            <img src={bill.url} alt={bill.fileName} className="w-full h-full object-cover" />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <Button size="sm" variant="outline" onClick={() => window.open(bill.url, '_blank')}>
                                                                View
                                                            </Button>
                                                            <Button size="sm" variant="destructive" onClick={() => handleDeleteBill(bill.id)}>
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-white truncate text-sm" title={bill.fileName}>{bill.fileName}</h4>
                                                        <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                                                            <span>{new Date(bill.date).toLocaleDateString()}</span>
                                                            <span>{bill.uploadedBy}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {bills.length === 0 && (
                                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 bg-neutral-900/30 rounded-xl border border-dashed border-neutral-800">
                                                    <FileText size={40} className="mb-4 opacity-50" />
                                                    <p>No bills uploaded yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            <ComponentDetailsModal
                component={selectedComponent}
                open={!!selectedComponent}
                onClose={() => setSelectedComponent(null)}
                onUpdate={() => {
                    fetchData();
                    if (activeTab === 'inventory') fetchData(); // Refresh current view
                }}
            />

            <Dialog open={!!reportDamageItem} onOpenChange={(open) => !open && setReportDamageItem(null)}>
                <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Report Damage: {reportDamageItem?.name}</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Log a damaged item. This will remove it from available stock.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Quantity Damaged</label>
                            <Input
                                type="number"
                                value={damageQty}
                                onChange={(e) => setDamageQty(Number(e.target.value))}
                                max={reportDamageItem?.availableQuantity}
                                min={1}
                                className="bg-neutral-950 border-neutral-800"
                            />
                            <p className="text-xs text-gray-500">Available: {reportDamageItem?.availableQuantity}</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reason</label>
                            <Textarea
                                value={damageReason}
                                onChange={(e) => setDamageReason(e.target.value)}
                                placeholder="Describe how it was damaged..."
                                className="bg-neutral-950 border-neutral-800"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setReportDamageItem(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleReportDamage}>Report Damage</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

