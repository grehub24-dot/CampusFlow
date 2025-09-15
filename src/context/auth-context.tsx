
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, type User as FirebaseUser } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User as AppUser } from '@/types';

const auth = getAuth(app);

interface AuthContextType {
    user: AppUser | null;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<any>;
    signOut: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                 if (firebaseUser.email === 'superadmin@campusflow.com') {
                    // Special case for the superadmin user
                    setUser({
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: 'Super Admin',
                        role: 'Admin',
                        lastLogin: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
                    });
                    setLoading(false);
                    return;
                }
                if (firebaseUser.email === 'support@campusflow.com') {
                    // Special case for the support user
                    setUser({
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: 'Support Team',
                        role: 'Support',
                        lastLogin: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
                    });
                    setLoading(false);
                    return;
                }

                // User is signed in, now fetch their role from Firestore
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const customData = docSnap.data();
                        setUser({
                            id: firebaseUser.uid,
                            email: firebaseUser.email || '',
                            name: customData.name || firebaseUser.displayName,
                            role: customData.role || 'User', // Default role if not set
                            lastLogin: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
                        });
                    } else {
                        // Handle case where user exists in Auth but not in Firestore
                        setUser({
                            id: firebaseUser.uid,
                            email: firebaseUser.email || '',
                            name: firebaseUser.displayName || 'User',
                            role: 'User', // Assign a default, least-privileged role
                            lastLogin: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
                        });
                    }
                     setLoading(false);
                });
                return () => unsubscribeFirestore();
            } else {
                // User is signed out
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

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
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
