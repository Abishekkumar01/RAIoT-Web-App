import { db } from "@/lib/firebase";
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
    increment,
    serverTimestamp,
    runTransaction
} from "firebase/firestore";
import { IComponent, IInventoryRequest, RequestStatus, IDamagedLog, IBill } from "@/types/inventory";

const INVENTORY_COLLECTION = "inventory_components";
const REQUESTS_COLLECTION = "inventory_requests";
const DAMAGED_COLLECTION = "inventory_damaged";
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
            quantity: Math.floor(component.quantity), // Enforce whole numbers
            availableQuantity: Math.floor(component.availableQuantity),
            arrivalDates: [{
                date: component.arrivalDate || new Date().toISOString(),
                quantity: Math.floor(component.quantity)
            }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

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
        if (updates.quantity !== undefined) updates.quantity = Math.floor(updates.quantity);
        if (updates.availableQuantity !== undefined) updates.availableQuantity = Math.floor(updates.availableQuantity);

        await updateDoc(docRef, {
            ...updates,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error updating component:", error);
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

// --- Requests (Cart Issuance) ---

export const submitInventoryRequest = async (requestData: Omit<IInventoryRequest, "id" | "status" | "createdAt" | "issueDate" | "dueDate">): Promise<string> => {
    try {
        // Enforce max 7 days limit
        const days = Math.min(Math.max(1, Math.floor(requestData.daysRequested)), 7);

        // Calculate Future Due Date
        const issueDate = new Date();
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + days);

        // Transaction to ensure stock is available for all items before creating the request
        return await runTransaction(db, async (transaction) => {
            // First read all components to ensure sufficient quantity
            const itemDocs = [];
            for (const item of requestData.items) {
                const componentRef = doc(db, INVENTORY_COLLECTION, item.componentId);
                const componentSnap = await transaction.get(componentRef);

                if (!componentSnap.exists()) throw new Error(`Component ${item.componentName} not found`);
                const data = componentSnap.data() as IComponent;

                if (data.availableQuantity < item.quantity) {
                    throw new Error(`Insufficient quantity for ${item.componentName}. Only ${data.availableQuantity} available.`);
                }
                itemDocs.push({ ref: componentRef, quantity: item.quantity });
            }

            // If all available, update the available quantity for all items
            for (const itemDoc of itemDocs) {
                transaction.update(itemDoc.ref, {
                    availableQuantity: increment(-Math.floor(itemDoc.quantity))
                });
            }

            // Create the request document
            const newRequestRef = doc(collection(db, REQUESTS_COLLECTION));
            const newRequest: Omit<IInventoryRequest, "id"> = {
                ...requestData,
                daysRequested: days,
                status: 'pending',
                issueDate: issueDate.toISOString(),
                dueDate: dueDate.toISOString(),
                createdAt: new Date().toISOString()
            };

            transaction.set(newRequestRef, newRequest);
            return newRequestRef.id;
        });

    } catch (error) {
        console.error("Error submitting inventory request:", error);
        throw error;
    }
};

export const updateRequestStatus = async (id: string, status: RequestStatus, rejectionReason?: string): Promise<void> => {
    try {
        const requestRef = doc(db, REQUESTS_COLLECTION, id);

        await runTransaction(db, async (transaction) => {
            const requestSnap = await transaction.get(requestRef);
            if (!requestSnap.exists()) throw new Error("Request not found");

            const requestData = requestSnap.data() as IInventoryRequest;

            // If Rejecting or Returning, we must restock the items
            if ((status === 'rejected' || status === 'returned') &&
                requestData.status !== 'rejected' && requestData.status !== 'returned') {

                for (const item of requestData.items) {
                    const componentRef = doc(db, INVENTORY_COLLECTION, item.componentId);
                    const componentSnap = await transaction.get(componentRef);
                    // Only restock if the component still exists in the database
                    if (componentSnap.exists()) {
                        transaction.update(componentRef, {
                            availableQuantity: increment(Math.floor(item.quantity))
                        });
                    } else {
                        console.warn(`Attempted to restock deleted component: ${item.componentName}`);
                    }
                }
            }

            const updates: Partial<IInventoryRequest> = { status };
            if (status === 'returned') updates.returnDate = new Date().toISOString();
            if (rejectionReason) updates.rejectionReason = rejectionReason;

            transaction.update(requestRef, updates);
        });
    } catch (error) {
        console.error("Error updating request status:", error);
        throw error;
    }
};

export const extendIssuanceDays = async (id: string, daysToAdd: number): Promise<void> => {
    try {
        const requestRef = doc(db, REQUESTS_COLLECTION, id);
        const requestSnap = await getDoc(requestRef);
        if (!requestSnap.exists()) throw new Error("Request not found");

        const requestData = requestSnap.data() as IInventoryRequest;
        const currentDueDate = new Date(requestData.dueDate);
        currentDueDate.setDate(currentDueDate.getDate() + Math.floor(daysToAdd));

        await updateDoc(requestRef, {
            dueDate: currentDueDate.toISOString(),
            daysRequested: increment(Math.floor(daysToAdd))
        });
    } catch (error) {
        console.error("Error extending issuance days:", error);
        throw error;
    }
}

export const getUserRequests = async (userId: string): Promise<IInventoryRequest[]> => {
    try {
        const q = query(collection(db, REQUESTS_COLLECTION), where("userId", "==", userId));
        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IInventoryRequest));
        return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
        console.error("Error fetching user requests:", error);
        throw error;
    }
};

export const getAllRequests = async (): Promise<IInventoryRequest[]> => {
    try {
        const q = query(collection(db, REQUESTS_COLLECTION), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IInventoryRequest));
    } catch (error) {
        console.error("Error fetching all requests:", error);
        throw error;
    }
};

export const checkDailyRequestLimit = async (userId: string): Promise<number> => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, REQUESTS_COLLECTION),
            where("userId", "==", userId)
        );
        const snapshot = await getDocs(q);

        // Filter in memory for today
        const todaysRequests = snapshot.docs.filter(doc => {
            const data = doc.data() as IInventoryRequest;
            return new Date(data.createdAt) >= startOfDay;
        });

        return todaysRequests.length;
    } catch (error) {
        console.error("Error checking daily limit:", error);
        return 0; // Better safe than breaking the app
    }
}

// --- Damaged Logs ---

export const reportDamage = async (componentId: string, quantity: number, reason: string, reportedBy: string): Promise<void> => {
    try {
        const componentRef = doc(db, INVENTORY_COLLECTION, componentId);

        await runTransaction(db, async (transaction) => {
            const componentSnap = await transaction.get(componentRef);
            if (!componentSnap.exists()) throw new Error("Component not found");
            const componentData = componentSnap.data() as IComponent;

            if (componentData.availableQuantity < quantity) {
                throw new Error("Cannot report damage more than available quantity");
            }

            transaction.update(componentRef, {
                quantity: increment(-Math.floor(quantity)),
                availableQuantity: increment(-Math.floor(quantity)),
                updatedAt: new Date().toISOString()
            });

            const newLogRef = doc(collection(db, DAMAGED_COLLECTION));
            transaction.set(newLogRef, {
                componentId,
                componentName: componentData.name,
                quantity: Math.floor(quantity),
                reason,
                reportedBy,
                date: new Date().toISOString()
            } as IDamagedLog);
        });

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
