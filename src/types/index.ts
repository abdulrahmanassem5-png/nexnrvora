// Shared TypeScript types for the data model
export interface User {
  uid: string;
  role: 'freelancer' | 'client';
  email: string;
  displayName: string;
  createdAt: Date | any;
  freelancerId: string | null;
  clientId?: string | null;
  bio?: string;
  skills?: string[];
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  customLogoUrl?: string; // Phase 2: custom branding
}

export interface PortfolioItem {
  id: string;
  freelancerId: string;
  title: string;
  description: string;
  imageUrl?: string;
  link?: string;
  order: number;
  createdAt: Date | any;
}

export interface Lead {
  id: string;
  freelancerId: string;
  name: string;
  email: string;
  status: 'new' | 'contacted' | 'negotiation' | 'converted' | 'lost';
  estimatedValue: number;
  notes: string;
  createdAt: Date | any;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  clientUserId: string | null;
  notes?: string;
  createdAt: Date | any;
}

export interface Project {
  id: string;
  clientId: string;
  title: string;
  status: 'in_progress' | 'in_review' | 'delivered';
  description: string;
  createdAt: Date;
  updatedAt: Date;
  review?: {
    rating: number;
    text: string;
    createdAt: Date | any;
    isPublic?: boolean;
  };
}

export interface ProjectFile {
  id: string;
  name: string;
  url: string;
  storagePath?: string;
  uploadedAt: Date | any;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id?: string;
  projectId: string;
  clientId: string;
  invoiceNumber: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issueDate: Date | any;
  dueDate: Date | any;
  createdAt?: Date | any;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  timeSpent: number; // in seconds
  createdAt: Date | any;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderRole: 'freelancer' | 'client';
  createdAt: Date | any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date | any;
  link?: string;
  type: 'message' | 'system' | 'review';
}

export interface Contract {
  id?: string;
  projectId: string;
  clientId: string;
  title: string;
  terms: string;
  value: number;
  status: 'draft' | 'sent' | 'signed';
  signedAt?: Date | any;
  clientSignature?: string;
  createdAt?: Date | any;
}
