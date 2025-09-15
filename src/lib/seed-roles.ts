
'use server'

import { collection, writeBatch, getDocs, doc } from "firebase/firestore";
import { db } from "./firebase";
import type { Role } from "@/types";

const defaultRoles: Role[] = [
    {
        id: 'admin',
        name: 'Admin',
        permissions: {} // Admin has all permissions implicitly
    },
    {
        id: 'accountant',
        name: 'Accountant',
        permissions: {
            dashboard: { read: true },
            admissions: { read: true, create: true, update: true, delete: false },
            students: { read: true, create: true, update: true, delete: false },
            staff: { read: true, create: false, update: false, delete: false },
            payments: { read: true, create: true, update: true, delete: true },
            invoices: { read: true, create: true, update: false, delete: false },
            fees: { read: true, create: false, update: false, delete: false },
            reports: { read: true },
            communications: { read: true, create: true },
            payroll: { read: true, run: true },
            transactions: { read: true, create: true, update: true, delete: true },
            billing: { read: true, update: false },
            settings: { read: false, update: false },
            activity: { read: true },
        }
    },
    {
        id: 'teacher',
        name: 'Teacher',
        permissions: {
            dashboard: { read: false },
            admissions: { read: false, create: false, update: false, delete: false },
            students: { read: true, create: false, update: false, delete: false },
            staff: { read: false, create: false, update: false, delete: false },
            payments: { read: false, create: false, update: false, delete: false },
            invoices: { read: false, create: false, update: false, delete: false },
            fees: { read: false, create: false, update: false, delete: false },
            reports: { read: false },
            communications: { read: true, create: true },
            payroll: { read: false, run: false },
            transactions: { read: false, create: false, update: false, delete: false },
            billing: { read: false, update: false },
            settings: { read: false, update: false },
            activity: { read: false },
        }
    },
    {
        id: 'support',
        name: 'Support',
        permissions: {
            dashboard: { read: false },
            admissions: { read: false, create: false, update: false, delete: false },
            students: { read: false, create: false, update: false, delete: false },
            staff: { read: false, create: false, update: false, delete: false },
            payments: { read: false, create: false, update: false, delete: false },
            invoices: { read: false, create: false, update: false, delete: false },
            fees: { read: false, create: false, update: false, delete: false },
            reports: { read: false },
            communications: { read: false, create: false },
            payroll: { read: false, run: false },
            transactions: { read: false, create: false, update: false, delete: false },
            billing: { read: true, update: true },
            settings: { read: true, update: true },
            activity: { read: false },
        }
    }
];

export async function seedRoles() {
    console.log("Seeding default roles...");
    const rolesCollectionRef = collection(db, "roles");
    const snapshot = await getDocs(rolesCollectionRef);

    if (snapshot.empty) {
        const batch = writeBatch(db);
        defaultRoles.forEach(role => {
            const docRef = doc(rolesCollectionRef, role.id);
            batch.set(docRef, role);
        });
        await batch.commit();
        console.log("Default roles have been seeded.");
    } else {
        console.log("Roles collection is not empty, skipping seed.");
    }
}
