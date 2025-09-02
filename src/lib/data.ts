

import type { Student, User, Payment, Invoice } from '@/types';

export const students: Student[] = [
  {
    id: 'STU-001',
    name: 'Alice Johnson',
    class: 'Grade 10',
    gender: 'Female',
    status: 'Active',
    email: 'alice.j@example.com',
    admissionDate: '2023-09-01',
  },
  {
    id: 'STU-002',
    name: 'Bob Smith',
    class: 'Grade 11',
    gender: 'Male',
    status: 'Active',
    email: 'bob.s@example.com',
    admissionDate: '2022-09-01',
  },
  {
    id: 'STU-003',
    name: 'Charlie Brown',
    class: 'Grade 9',
    gender: 'Male',
    status: 'Active',
    email: 'charlie.b@example.com',
    admissionDate: '2024-01-15',
  },
  {
    id: 'STU-004',
    name: 'Diana Prince',
    class: 'Grade 12',
    gender: 'Female',
    status: 'Graduated',
    email: 'diana.p@example.com',
    admissionDate: '2020-09-01',
  },
  {
    id: 'STU-005',
    name: 'Ethan Hunt',
    class: 'Grade 10',
    gender: 'Male',
    status: 'Inactive',
    email: 'ethan.h@example.com',
    admissionDate: '2023-09-01',
  },
  {
    id: 'STU-006',
    name: 'Fiona Glenanne',
    class: 'Grade 11',
    gender: 'Female',
    status: 'Active',
    email: 'fiona.g@example.com',
    admissionDate: '2022-09-01',
  },
  {
    id: 'STU-007',
    name: 'George Costanza',
    class: 'Grade 9',
    gender: 'Male',
    status: 'Active',
    email: 'george.c@example.com',
    admissionDate: '2024-01-15',
  },
  {
    id: 'STU-008',
    name: 'Hannah Montana',
    class: 'Grade 12',
    gender: 'Female',
    status: 'Active',
    email: 'hannah.m@example.com',
    admissionDate: '2021-09-01',
  },
  {
    id: 'STU-009',
    name: 'Isaac Newton',
    class: 'Grade 10',
    gender: 'Male',
    status: 'Active',
    email: 'isaac.n@example.com',
    admissionDate: '2023-09-01',
  },
  {
    id: 'STU-010',
    name: 'Jane Eyre',
    class: 'Grade 11',
    gender: 'Female',
    status: 'Active',
    email: 'jane.e@example.com',
    admissionDate: '2022-09-01',
  },
];

export const users: User[] = [
    {
        id: "USR-001",
        name: "Dr. Evelyn Reed",
        email: "e.reed@school.edu",
        role: "Admin",
        lastLogin: "2024-07-30T10:00:00Z"
    },
    {
        id: "USR-002",
        name: "Mr. Samuel Carter",
        email: "s.carter@school.edu",
        role: "Teacher",
        lastLogin: "2024-07-30T09:30:00Z"
    },
    {
        id: "USR-003",
        name: "Ms. Olivia Hayes",
        email: "o.hayes@school.edu",
        role: "Accountant",
        lastLogin: "2024-07-29T15:45:00Z"
    },
    {
        id: "USR-004",
        name: "Mr. Benjamin Grant",
        email: "b.grant@school.edu",
        role: "Teacher",
        lastLogin: "2024-07-30T08:00:00Z"
    }
];

export const recentPayments: Payment[] = [
  {
    id: 'PAY-001',
    studentName: 'Alice Johnson',
    studentId: 'STU-001',
    amount: 500,
    date: '2024-07-28',
    status: 'Paid',
  },
  {
    id: 'PAY-002',
    studentName: 'Bob Smith',
    studentId: 'STU-002',
    amount: 500,
    date: '2024-07-27',
    status: 'Paid',
  },
  {
    id: 'PAY-003',
    studentName: 'Fiona Glenanne',
    studentId: 'STU-006',
    amount: 500,
    date: '2024-07-26',
    status: 'Paid',
  },
    {
    id: 'PAY-004',
    studentName: 'Isaac Newton',
    studentId: 'STU-009',
    amount: 500,
    date: '2024-07-25',
    status: 'Paid',
  },
];

export const pendingInvoices: Invoice[] = [
    {
        id: 'INV-001',
        studentName: 'Charlie Brown',
        studentId: 'STU-003',
        amount: 500,
        dueDate: '2024-08-15',
    },
    {
        id: 'INV-002',
        studentName: 'George Costanza',
        studentId: 'STU-007',
        amount: 500,
        dueDate: '2024-08-15',
    },
    {
        id: 'INV-003',
        studentName: 'Hannah Montana',
        studentId: 'STU-008',
        amount: 500,
        dueDate: '2024-08-10',
    },
     {
        id: 'INV-004',
        studentName: 'Jane Eyre',
        studentId: 'STU-010',
        amount: 500,
        dueDate: '2024-08-12',
    },
]
