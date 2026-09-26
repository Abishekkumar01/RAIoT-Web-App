import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { Achievement } from '@/lib/types/achievement';

const COLLECTION_NAME = 'achievements';

export const getAchievements = async (): Promise<Achievement[]> => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Achievement));
};

export const addAchievement = async (achievement: Omit<Achievement, 'id'>) => {
    return addDoc(collection(db, COLLECTION_NAME), {
        ...achievement,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
};

export const updateAchievement = async (id: string, achievement: Partial<Achievement>) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    return updateDoc(docRef, {
        ...achievement,
        updatedAt: serverTimestamp(),
    });
};

export const deleteAchievement = async (id: string) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    return deleteDoc(docRef);
};
