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

export type IssuanceStatus = 'pending' | 'approved' | 'rejected' | 'issued' | 'returned' | 'overdue';

export interface IIssuance {
    id: string;
    componentId: string;
    componentName: string; // Denormalized for easier display
    componentImage?: string;
    userId: string;
    userName: string;
    userEmail: string;
    quantity: number;
    issueDate: string; // ISO
    dueDate: string; // ISO
    returnDate?: string; // ISO
    status: IssuanceStatus;
    purpose?: string;
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
