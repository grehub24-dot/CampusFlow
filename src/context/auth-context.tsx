

'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, type User as FirebaseUser, updateProfile, updateEmail, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import type { User as AppUser, Role } from '@/types';
import { getFunctions, httpsCallable } from "firebase/functions";

const auth = getAuth(app);
const functions = getFunctions(app);

// These functions are currently disabled as they require backend deployment.
// const updateUserStatusInAuth = httpsCallable(functions, 'updateUserStatus');
// const deleteUserFromAuth = httpsCallable(functions, 'deleteUserAccount');

interface AuthContextType {
    user: AppUser | null;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<any>;
    signOut: () => Promise<any>;
    hasPermission: (permission: string) => boolean;
    updateUserStatus: (uid: string, disabled: boolean) => Promise<any>;
    deleteUserAccount: (uid: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const rolesQuery = query(collection(db, "roles"));
        const unsubscribeRoles = onSnapshot(rolesQuery, async (snapshot) => {
            if (snapshot.empty) {
                // Seed roles if collection is empty
                const { seedRoles } = await import('@/lib/seed-roles');
                await seedRoles();
            } else {
                setRoles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role)));
            }
        });
        return () => unsubscribeRoles();
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                 if (firebaseUser.email === 'superadmin@campusflow.com') {
                    setUser({
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: 'Super Admin',
                        role: 'Admin',
                        lastLogin: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
                        disabled: firebaseUser.disabled,
                    });
                    setLoading(false);
                    return;
                }
                if (firebaseUser.email === 'support@campusflow.com') {
                    setUser({
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: 'Support Team',
                        role: 'Support',
                        lastLogin: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
                        disabled: firebaseUser.disabled,
                    });
                    setLoading(false);
                    return;
                }

                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const customData = docSnap.data();
                        setUser({
                            id: firebaseUser.uid,
                            email: firebaseUser.email || '',
                            name: customData.name || firebaseUser.displayName,
                            role: customData.role || 'User',
                            lastLogin: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
                            disabled: firebaseUser.disabled,
                        });
                    } else {
                        // This case is unlikely if users are created properly
                        setUser({
                            id: firebaseUser.uid,
                            email: firebaseUser.email || '',
                            name: firebaseUser.displayName || 'User',
                            role: 'User',
                            lastLogin: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
                            disabled: firebaseUser.disabled,
                        });
                    }
                     setLoading(false);
                });
                return () => unsubscribeFirestore();
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const signIn = (email: string, pass: string) => {
        return signInWithEmailAndPassword(auth, email, pass);
    }

    const signOut = () => {
        return firebaseSignOut(auth);
    }
    
    const hasPermission = (permission: string) => {
        if (!user || roles.length === 0) return false;
        
        // Super Admin bypass
        if (user.role === 'Admin' && user.email === 'superadmin@campusflow.com') return true;
        
        const userRole = roles.find(r => r.name === user.role);
        if (!userRole || !userRole.permissions) return false;

        const [feature, action] = permission.split(':');
        
        return userRole.permissions[feature]?.[action] === true;
    }

    const updateUserStatus = async (uid: string, disabled: boolean) => {
        // await updateUserStatusInAuth({ uid, disabled });
        console.warn("User status update in Firebase Auth is disabled. Updating Firestore only.");
        // Also update the local Firestore record
        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, { disabled });
    }
    
    const deleteUserAccount = async (uid: string) => {
        // await deleteUserFromAuth({ uid });
        console.warn("User deletion from Firebase Auth is disabled. Deleting from Firestore only.");
        // Also delete the local Firestore record
        const userDocRef = doc(db, 'users', uid);
        await deleteDoc(userDocRef);
    }


    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut, hasPermission, updateUserStatus, deleteUserAccount }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
