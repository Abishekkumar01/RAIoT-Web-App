import { db } from "@/lib/firebase"; // Assuming standard firebase export
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
    increment,
    setDoc
} from "firebase/firestore";
import { IComponent, IIssuance, IssuanceStatus, IBill, IDamagedLog } from "@/types/inventory";

const INVENTORY_COLLECTION = "inventory";
const ISSUANCE_COLLECTION = "issuances";
const DAMAGED_COLLECTION = "damaged_logs";
const BILLS_COLLECTION = "bills";

// --- Inventory CRUD ---

export const getInventory = async (): Promise<IComponent[]> => {
    try {
        const q = query(collection(db, INVENTORY_COLLECTION), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IComponent));
    } catch (error) {
        console.error("Error fetching inventory:", error);
        throw error;
    }
};

export const getComponent = async (id: string): Promise<IComponent | null> => {
    try {
        const docRef = doc(db, INVENTORY_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() } as IComponent;
        }
        return null;
    } catch (error) {
        console.error("Error fetching component:", error);
        throw error;
    }
};

export const addComponent = async (component: Omit<IComponent, "id" | "createdAt" | "arrivalDates"> & { arrivalDate?: string }): Promise<string> => {
    try {
        const newComponent = {
            ...component,
            arrivalDates: [{
                date: component.arrivalDate || new Date().toISOString(),
                quantity: component.quantity
            }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Sanitize object to remove undefined values
        const sanitizedComponent = Object.fromEntries(
            Object.entries(newComponent).filter(([_, v]) => v !== undefined)
        );

        const docRef = await addDoc(collection(db, INVENTORY_COLLECTION), sanitizedComponent);
        return docRef.id;
    } catch (error) {
        console.error("Error adding component:", error);
        throw error;
    }
};

export const updateComponent = async (id: string, updates: Partial<IComponent>): Promise<void> => {
    try {
        const docRef = doc(db, INVENTORY_COLLECTION, id);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error updating component:", error);
        throw error;
    }
};

export const restockComponent = async (id: string, quantityToAdd: number): Promise<void> => {
    try {
        const docRef = doc(db, INVENTORY_COLLECTION, id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) throw new Error("Component not found");

        const currentData = docSnap.data() as IComponent;
        const newArrivalDates = [
            ...(currentData.arrivalDates || []),
            { date: new Date().toISOString(), quantity: quantityToAdd }
        ];

        await updateDoc(docRef, {
            quantity: increment(quantityToAdd),
            availableQuantity: increment(quantityToAdd),
            arrivalDates: newArrivalDates,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error restocking component:", error);
        throw error;
    }
};

export const deleteComponent = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, INVENTORY_COLLECTION, id));
    } catch (error) {
        console.error("Error deleting component:", error);
        throw error;
    }
};

// --- Issuance / Requests ---

export const requestComponent = async (issuanceCount: Omit<IIssuance, "id" | "status" | "issueDate" | "returnDate">): Promise<string> => {
    try {
        // 1. Check availability
        const componentRef = doc(db, INVENTORY_COLLECTION, issuanceCount.componentId);
        const componentSnap = await getDoc(componentRef);

        if (!componentSnap.exists()) throw new Error("Component not found");
        const componentData = componentSnap.data() as IComponent;

        if (componentData.availableQuantity < issuanceCount.quantity) {
            throw new Error("Insufficient quantity available");
        }

        // 2. Reduce Available Quantity IMMEDIATELY (or reserve it)
        // For simplicity, we reduce it on request. If rejected, we add it back.
        await updateDoc(componentRef, {
            availableQuantity: increment(-issuanceCount.quantity)
        });

        // 3. Create Issuance Record
        const newIssuance = {
            ...issuanceCount,
            status: 'pending' as IssuanceStatus,
            issueDate: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, ISSUANCE_COLLECTION), newIssuance);
        return docRef.id;

    } catch (error) {
        console.error("Error requesting component:", error);
        throw error;
    }
};

export const updateIssuanceStatus = async (id: string, status: IssuanceStatus): Promise<void> => {
    try {
        const issuanceRef = doc(db, ISSUANCE_COLLECTION, id);
        const issuanceSnap = await getDoc(issuanceRef);

        if (!issuanceSnap.exists()) throw new Error("Issuance not found");
        const issuanceData = issuanceSnap.data() as IIssuance;

        // Handle Logic for Rejections/Returns
        // If REJECTED or RETURNED, we must return the stock.
        // NOTE: We already deducted stock on Request.

        if (status === 'rejected' && issuanceData.status !== 'rejected') {
            // Return stock
            const componentRef = doc(db, INVENTORY_COLLECTION, issuanceData.componentId);
            await updateDoc(componentRef, {
                availableQuantity: increment(issuanceData.quantity)
            });
        }

        if (status === 'returned' && issuanceData.status !== 'returned') {
            // Return stock
            const componentRef = doc(db, INVENTORY_COLLECTION, issuanceData.componentId);
            await updateDoc(componentRef, {
                availableQuantity: increment(issuanceData.quantity)
            });
        }

        await updateDoc(issuanceRef, {
            status,
            ...(status === 'returned' ? { returnDate: new Date().toISOString() } : {}),
            updatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error("Error updating issuance status:", error);
        throw error;
    }
};

export const getUserIssuances = async (userId: string): Promise<IIssuance[]> => {
    try {
        const q = query(
            collection(db, ISSUANCE_COLLECTION),
            where("userId", "==", userId),
            orderBy("issueDate", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IIssuance));
    } catch (error) {
        console.error("Error fetching user issuances:", error);
        throw error;
    }
};

export const getAllIssuances = async (): Promise<IIssuance[]> => {
    try {
        const q = query(collection(db, ISSUANCE_COLLECTION), orderBy("issueDate", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IIssuance));
    } catch (error) {
        console.error("Error fetching all issuances:", error);
        throw error;
    }
};

// --- Damaged Logs ---

export const reportDamage = async (componentId: string, quantity: number, reason: string, reportedBy: string): Promise<void> => {
    try {
        const componentRef = doc(db, INVENTORY_COLLECTION, componentId);
        const componentSnap = await getDoc(componentRef);

        if (!componentSnap.exists()) throw new Error("Component not found");
        const componentData = componentSnap.data() as IComponent;

        if (componentData.availableQuantity < quantity) {
            throw new Error("Cannot report damage more than available quantity");
        }

        // 1. Reduce Stock
        await updateDoc(componentRef, {
            quantity: increment(-quantity),
            availableQuantity: increment(-quantity),
            updatedAt: new Date().toISOString()
        });

        // 2. Add Log
        await addDoc(collection(db, DAMAGED_COLLECTION), {
            componentId,
            componentName: componentData.name,
            quantity,
            reason,
            reportedBy,
            date: new Date().toISOString()
        } as IDamagedLog);

    } catch (error) {
        console.error("Error reporting damage:", error);
        throw error;
    }
};

export const getDamagedLogs = async (): Promise<IDamagedLog[]> => {
    try {
        const q = query(collection(db, DAMAGED_COLLECTION), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IDamagedLog));
    } catch (error) {
        console.error("Error fetching damaged logs:", error);
        throw error;
    }
};

// --- Bills ---

export const getBills = async (): Promise<IBill[]> => {
    try {
        const q = query(collection(db, BILLS_COLLECTION), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IBill));
    } catch (error) {
        console.error("Error fetching bills:", error);
        throw error;
    }
}

export const addBill = async (bill: Omit<IBill, "id" | "date">): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, BILLS_COLLECTION), {
            ...bill,
            date: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding bill:", error);
        throw error;
    }
}

export const deleteBill = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, BILLS_COLLECTION, id));
    } catch (error) {
        console.error("Error deleting bill:", error);
        throw error;
    }
}
