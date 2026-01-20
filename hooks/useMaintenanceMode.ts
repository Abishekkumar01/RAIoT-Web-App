"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const useMaintenanceMode = () => {
    const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const docRef = doc(db, "system", "settings");

        // Subscribe to real-time updates
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setIsMaintenanceMode(docSnap.data().maintenanceMode || false);
            } else {
                // Create default if it doesn't exist
                setDoc(docRef, { maintenanceMode: false }, { merge: true });
                setIsMaintenanceMode(false);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching maintenance status:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const toggleMaintenanceMode = async (newValue: boolean) => {
        try {
            await setDoc(doc(db, "system", "settings"), {
                maintenanceMode: newValue,
                updatedAt: new Date()
            }, { merge: true });
        } catch (error) {
            console.error("Error updating maintenance mode:", error);
            throw error;
        }
    };

    return { isMaintenanceMode, toggleMaintenanceMode, loading };
};
