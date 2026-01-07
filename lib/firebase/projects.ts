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
import { Project } from '@/lib/types/project';

const COLLECTION_NAME = 'projects';

export const getProjects = async (): Promise<Project[]> => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
};

export const addProject = async (project: Omit<Project, 'id'>) => {
    return addDoc(collection(db, COLLECTION_NAME), {
        ...project,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
};

export const updateProject = async (id: string, project: Partial<Project>) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    return updateDoc(docRef, {
        ...project,
        updatedAt: serverTimestamp(),
    });
};

export const deleteProject = async (id: string) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    return deleteDoc(docRef);
};
