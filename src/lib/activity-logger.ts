'use server';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from '@/types';

export async function logActivity(
  user: User | null,
  action: string,
  details: string
) {
  if (!user) return; // Don't log if user is not available
  try {
    await addDoc(collection(db, 'activity-log'), {
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      action,
      details,
    });
  } catch (error) {
    console.error("Error logging activity: ", error);
  }
}
