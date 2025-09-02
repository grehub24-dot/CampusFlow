

export type Student = {
  id: string; // This is the Firestore document ID
  name: string;
  class: string;
  gender: 'Male' | 'Female';
  status: 'Active' | 'Inactive' | 'Graduated';
  email: string;
  admissionDate: string;
  admissionTerm?: string;
  admissionYear?: string;
  paymentStatus?: 'Paid' | 'Pending' | 'Unpaid';
  // From form
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  previousSchool?: string;
  notes?: string;
};

export type Payment = {
  id: string;
  studentName: string;
  studentId: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Failed';
};

export type Invoice = {
  id: string;
  studentName: string;
  studentId: string;
  amount: number;
  dueDate: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Teacher' | 'Accountant';
  lastLogin: string;
};

export type Report = {
  reportContent: string;
  reportFormat: string;
};
