
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SchoolInformation } from '@/types';
import crypto from 'crypto';

interface SchoolInfoContextType {
  schoolInfo: SchoolInformation | null;
  loading: boolean;
  setSchoolInfo: (info: SchoolInformation) => void;
}

const SchoolInfoContext = createContext<SchoolInfoContextType | undefined>(
  undefined
);

// Helper to generate the dynamic system ID
const generateSystemId = (plan: string = 'free', schoolId: string = 'default') => {
    const year = new Date().getFullYear().toString().slice(-2);
    const planInitial = (plan[0] || 'f').toUpperCase();
    const uniqueHash = schoolId.substring(0, 4); // Use a portion of a stable ID
    return `NX${year}${planInitial}-${uniqueHash}`;
};


export const SchoolInfoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [schoolInfo, setSchoolInfo] = useState<SchoolInformation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const schoolInfoDocRef = doc(db, 'settings', 'school-info');
    const billingDocRef = doc(db, 'settings', 'billing');
    
    // Using a stable unique ID for the school instance.
    // Here, we'll use the path hash, but in a multi-tenant app, this would be the school's own document ID.
    const schoolInstanceId = crypto.createHash('md5').update(schoolInfoDocRef.path).digest('hex');

    const unsubscribeSchoolInfo = onSnapshot(schoolInfoDocRef, (schoolDoc) => {
      const unsubscribeBilling = onSnapshot(billingDocRef, (billingDoc) => {
        const schoolData = schoolDoc.data() || {};
        const billingData = billingDoc.data() || {};
        
        const currentPlan = billingData.currentPlan || 'free';
        const systemId = generateSystemId(currentPlan, schoolInstanceId);

        const mergedInfo: SchoolInformation = {
          schoolName: 'CampusFlow',
          currentPlan: 'free',
          ...schoolData,
          ...billingData,
          systemId: systemId, // Always generate dynamically
        };
        
        setSchoolInfo(mergedInfo);
        setLoading(false);
      });
      return () => unsubscribeBilling();
    }, (error) => {
      console.error('Error fetching school info:', error);
      setLoading(false);
    });

    return () => {
      unsubscribeSchoolInfo();
    };
  }, []);

  const handleSetSchoolInfo = (info: SchoolInformation) => {
    setSchoolInfo(info);
  };

  return (
    <SchoolInfoContext.Provider
      value={{ schoolInfo, loading, setSchoolInfo: handleSetSchoolInfo }}
    >
      {children}
    </SchoolInfoContext.Provider>
  );
};

export const useSchoolInfo = () => {
  const context = useContext(SchoolInfoContext);
  if (context === undefined) {
    throw new Error('useSchoolInfo must be used within a SchoolInfoProvider');
  }
  return context;
};
