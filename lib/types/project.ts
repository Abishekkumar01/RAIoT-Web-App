export interface Project {
    id?: string;
    title: string;
    description: string;
    status: 'completed' | 'ongoing' | 'planned';
    technologies: string[];
    teamMembers: string[];
    image: string;
    githubLink?: string;
    demoLink?: string;
    completedDate?: string;
    batch?: string;
    batchHighlight?: string;
    createdAt?: any; // Firestore Timestamp
    updatedAt?: any; // Firestore Timestamp
}
