
import type { Student, User, Payment, Invoice } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Mock data is no longer needed as the application now fetches data from Firestore.
// You can create collections in your Firestore database named 'students', 'users', 
// 'payments', and 'invoices' to populate the application with data.

export const students: Student[] = [];
export const users: User[] = [];
export const recentPayments: Payment[] = [];
export const pendingInvoices: Invoice[] = [];
