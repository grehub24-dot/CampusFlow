

export type Student = {
  id: string; // This is the Firestore document ID
  name: string;
  class: string;
  classId: string; // Ensure this is always present
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

export type FeeItem = {
    name: string;
    amount: number;
    included?: boolean;
}

export type Payment = {
  id: string;
  studentName: string;
  studentId: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Failed';
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'Mobile Money' | 'Card' | 'Cheque';
  academicYear?: string;
  term?: string;
  notes?: string;
  items?: FeeItem[];
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

export type AcademicTerm = {
    id: string;
    academicYear: string;
    session: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
}

export type SchoolClass = {
  id: string;
  name: string;
  category: 'Pre-school' | 'Primary' | 'Junior High School';
};

export type FeeStructure = {
  id: string;
  classId: string;
  academicTermId: string;
  admissionFee?: number;
  schoolFees?: number;
  booksFee?: number;
  uniformFee?: number;
  printingFee?: number;
  others?: number;
}

    