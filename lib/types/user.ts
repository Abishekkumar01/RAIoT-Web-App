export type UserRole =
  | 'public'
  | 'guest'
  | 'member'
  | 'admin'
  | 'superadmin'
  | 'junior_developer'
  | 'senior_developer'
  | 'student_coordinator'
  | 'inventory_head'
  | 'vice_president'
  | 'president'
  | 'public_relation_head'
  | 'content_creation_head'
  | 'management_head'
  | 'technical_head'
  | 'operations'

export interface User {
  uid: string
  email: string
  displayName: string
  role: UserRole
  uniqueId?: string
  profileData?: {
    phone?: string
    year?: string
    branch?: string
    rollNumber?: string
    bio?: string
    skills?: string[]
    githubLink?: string
    linkedinLink?: string
    websiteLink?: string
    organization?: string
    department?: string
    city?: string
    idCardUrl?: string
    photoUrl?: string
    tagline?: string
    projects?: Array<{
      title: string;
      description: string;
      link: string;
      imageUrl: string;
    }>
    achievements?: string[]
    contributions?: string[]
  }
  attendance?: AttendanceRecord[]
  createdAt: Date
  updatedAt: Date
}

export interface AttendanceRecord {
  eventId: string
  eventName: string
  date: Date
  status: 'present' | 'absent' | 'late'
}

export interface Event {
  id: string
  title: string
  description: string
  date: Date
  location: string
  type: 'workshop' | 'seminar' | 'competition' | 'meeting'
  registrationRequired: boolean
  maxParticipants?: number
  registeredUsers?: string[]
  createdBy: string
  createdAt: Date
}

export interface Project {
  id: string
  title: string
  description: string
  technologies: string[]
  teamMembers: string[]
  status: 'ongoing' | 'completed' | 'planned'
  images?: string[]
  githubLink?: string
  createdAt: Date
}

export interface Member {
  rollNumber: string
  name: string
  email: string
  imageUrl?: string
  department: string
  year: string
  phone?: string
  bio?: string
  skills?: string[]
  githubLink?: string
  linkedinLink?: string
  websiteLink?: string
  events?: string[]
  projects?: string[]
  isRegistered: boolean
  profileViews?: number
  createdAt: Date
  updatedAt: Date
}

export interface MemberRegistrationData {
  rollNumber: string
  name: string
  email: string
  department: string
  year: string
  phone?: string
  imageUrl?: string
}
