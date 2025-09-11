

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
  studentId?: string;
  studentName?: string;
  admissionId?: string;
  studentClass?: string;
  amount: number; // outstanding balance
  dueDate?: string;
  items?: { name: string, amount: number }[];
  totalAmount: number; // total bill for the term
  amountPaid: number; // total paid so far for the term
  // For checkout
  status?: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  createdAt?: string;
  reference?: string;
  naloInvoiceNo?: string;
  naloStatusTimestamp?: string;
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
    msgid?: string;
    recipient: string;
    content: string;
    status: string;
    statusDate?: string;
    reason?: string;
    sentDate: string;
    handleCharge?: number;
    topupCharge?: number;
};

export type IntegrationSettings = {
    frogApiKey?: string;
    frogSenderId?: string;
    frogUsername?: string;
    naloMerchantId?: string;
    naloUsername?: string;
    naloPassword?: string;
    smsOnAdmission?: boolean;
    smsOnPayment?: boolean;
    smsOnFeeReminder?: boolean;
    whatsAppEnabled?: boolean;
    whatsappAccessToken?: string;
    whatsappPhoneNumberId?: string;
}

export type AdmissionSettings = {
    prefix?: string;
    padding?: number;
}

export type SchoolInformation = {
    schoolName: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    invoiceFooter?: string;
    paymentTerms?: string;
    paymentMethods?: string;
    currentPlan: 'free' | 'starter' | 'pro' | 'enterprise';
}

export type MomoProvider = {
    code: "MTN" | "VODAFONE" | "AIRTELTIGO";
    name: string;
}

export type CommunicationTemplate = {
    id: string;
    name: string; // Subject for email, name for SMS
    content: string;
    type: 'SMS' | 'Email';
}

export type Bundle = {
    name: string;
    msgCount: number;
    price: number;
    validity: number;
}

export type OtpResponse = {
  status: "SUCCESS" | "ERROR" | "FAILED";
  message: string;
}

export type StaffDeduction = {
  id?: string;
  name: string;
  amount: number;
}

export type StaffArrears = {
  id?: string;
  name: string;
  amount: number;
}

export type StaffMember = {
    id: string;
    name: string;
    role: string;
    grossSalary: number;
    ssnitEmployee: number;
    ssnitEmployer: number;
    taxableIncome: number;
    incomeTax: number;
    netSalary: number;
    bankName?: string;
    accountNumber?: string;
    momoNumber?: string;
    status: 'Active' | 'Inactive';
    contractStatus?: 'Probation' | 'Full-Time' | 'Part-Time' | 'Attachment' | 'Service';
    arrears?: StaffArrears[];
    employmentDate?: string;
    qualification?: string;
    subjectsTaught?: string;
    notes?: string;
    deductions?: StaffDeduction[];
}

export type Payslip = {
    id: string; // Use staffId for this
    staffName: string;
    period: string; // e.g., "May 2024"
    grossSalary: number;
    ssnitEmployee: number;
    ssnitEmployer: number;
    incomeTax: number;
    netSalary: number;
    deductions: StaffDeduction[];
    arrears: StaffArrears[];
}

export type PayrollRun = {
    id: string;
    runDate: string;
    period: string;
    totalAmount: number;
    employeeCount: number;
    payslips: Payslip[];
}

export type TransactionCategory = {
    id: string;
    name: string;
    type: 'income' | 'expense';
}

export type Transaction = {
    id: string;
    date: string;
    type: 'income' | 'expense';
    amount: number;
    categoryId: string;
    categoryName: string;
    description: string;
    isFromPayment?: boolean; // Flag to identify transactions from student payments
}

export type FinancialSummaryItem = {
    category: string;
    total: number;
}
