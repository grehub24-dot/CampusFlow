

export type Student = {
  id: string; // This is the Firestore document ID
  admissionId?: string; // Add this new field
  name: string;
  class: string;
  classId: string; // Ensure this is always present
  classCategory?: string; // Add category to student
  gender: 'Male' | 'Female';
  status: 'Active' | 'Inactive' | 'Graduated' | 'Stopped';
  email: string;
  admissionDate: string;
  admissionTerm?: string;
  admissionYear?: string;
  paymentStatus?: 'Paid' | 'Part-Payment' | 'Pending' | 'Unpaid';
  // From form
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  previousSchool?: string;
  notes?: string;

  // For fee calculation logic
  isNewAdmission?: boolean;
  currentTermNumber?: number;
};

export type PaymentFeeItem = {
    name: string;
    amount: number;
}

export type Payment = {
  id: string;
  studentName: string;
  studentId: string;
  amount: number; // This is the amount paid
  totalAmountDue: number;
  balance: number;
  receiptNo?: string;
  date: string;
  status: 'Full Payment' | 'Part Payment' | 'Failed';
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'Mobile Money' | 'Card' | 'Cheque';
  academicYear?: string;
  term?: string;
  notes?: string;
  items?: PaymentFeeItem[];
};

export type Invoice = {
  id: string;
  studentId: string;
  studentName: string;
  admissionId?: string;
  studentClass?: string;
  amount: number; // outstanding balance
  dueDate: string;
  items: { name: string, amount: number }[];
  totalAmount: number; // total bill for the term
  amountPaid: number; // total paid so far for the term
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

export type FeeItem = {
    id: string;
    name: string;
    isOptional: boolean;
    appliesTo: ('new' | 'term1' | 'term2_3')[];
}

export type FeeStructureItem = {
    feeItemId: string;
    amount: number;
}

export type FeeStructure = {
  id:string;
  classId: string;
  academicTermId: string;
  items: FeeStructureItem[];
}

export type Message = {
    id: string;
    recipient: string;
    type: 'SMS' | 'Email';
    content: string;
    status: 'Sent' | 'Failed' | 'Pending';
    date: string;
};

export type IntegrationSettings = {
    frogApiKey?: string;
    frogSenderId?: string;
    frogUsername?: string;
}

export type AdmissionSettings = {
    prefix?: string;
    padding?: number;
}
