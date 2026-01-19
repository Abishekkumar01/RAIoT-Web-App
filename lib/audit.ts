
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type AuditAction =
    | 'CREATE_EVENT'
    | 'UPDATE_EVENT'
    | 'DELETE_EVENT'
    | 'PUBLISH_CLASS'
    | 'MARK_ATTENDANCE'
    | 'DELETE_USER'
    | 'UPDATE_USER_ROLE'

interface AuditLogParams {
    action: AuditAction
    resourceType: 'events' | 'attendance' | 'users' | 'inventory'
    resourceId: string
    userId: string
    userName: string
    metadata?: Record<string, any>
}

export const logAuditAction = async ({
    action,
    resourceType,
    resourceId,
    userId,
    userName,
    metadata = {}
}: AuditLogParams) => {
    try {
        await addDoc(collection(db, 'audit_logs'), {
            action,
            resourceType,
            resourceId,
            userId,
            userName,
            metadata,
            timestamp: serverTimestamp(),
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
        })
    } catch (error) {
        console.error("Failed to write audit log:", error)
        // We generally don't want to block the user action if logging fails, 
        // but we should definitely know about it.
    }
}
