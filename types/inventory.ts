export type ComponentType = 'Sensor' | 'Microcontroller' | 'Actuator' | 'Tool' | 'Other';

export interface IComponent {
    id: string; // Firestore Doc ID
    name: string;
    quantity: number; // Total owned
    availableQuantity: number; // Currently in stock
    type: ComponentType | string;
    imageUrl: string;
    description?: string;
    arrivalDates: {
        date: string; // ISO String
        quantity: number;
    }[];
    createdAt: string; // ISO String
    updatedAt?: string; // ISO String
}

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'returned';

export interface IRequestItem {
    componentId: string;
    componentName: string;
    quantity: number;
    imageUrl?: string;
}

export interface IInventoryRequest {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    items: IRequestItem[];
    daysRequested: number;
    status: RequestStatus;
    issueDate: string; // ISO
    dueDate: string; // ISO
    returnDate?: string; // ISO
    rejectionReason?: string;
    warningEmailSent?: boolean;
    extensionRequestedDays?: number;
    extensionRequestStatus?: 'pending' | 'approved' | 'rejected';
    extensionRequestedAt?: string;
    extensionApprovedAt?: string;
    extensionRejectedAt?: string;
    extensionRejectionReason?: string;
    createdAt: string; // ISO
}

export interface IDamagedLog {
    id: string;
    componentId: string;
    componentName: string;
    quantity: number;
    reason: string;
    reportedBy: string; // User ID or Name
    date: string;
}

export interface IBill {
    id: string;
    fileName: string;
    url: string;
    date: string; // ISO date of upload
    uploadedBy: string; // Admin User Name
}
