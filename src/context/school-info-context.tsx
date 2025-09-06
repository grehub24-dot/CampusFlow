
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SchoolInformation } from '@/types';

interface SchoolInfoContextType {
  schoolInfo: SchoolInformation | null;
  loading: boolean;
  setSchoolInfo: (info: SchoolInformation) => void;
}

const SchoolInfoContext = createContext<SchoolInfoContextType | undefined>(
  undefined
);

export const SchoolInfoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [schoolInfo, setSchoolInfo] = useState<SchoolInformation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const schoolInfoDocRef = doc(db, 'settings', 'school-info');
    const billingDocRef = doc(db, 'settings', 'billing');

    const unsubscribeSchoolInfo = onSnapshot(
      schoolInfoDocRef,
      (doc) => {
        const schoolData = doc.data() as SchoolInformation;
        setSchoolInfo((prev) => ({ ...(prev || {}), ...schoolData } as SchoolInformation));
      },
      (error) => {
        console.error('Error fetching school info:', error);
      }
    );
    
    const unsubscribeBilling = onSnapshot(
      billingDocRef,
      (doc) => {
        const billingData = doc.data() as SchoolInformation;
         setSchoolInfo((prev) => ({ ...(prev || {}), ...billingData } as SchoolInformation));
      },
      (error) => {
        console.error('Error fetching billing info:', error);
      }
    )

    // Initial load check
    Promise.all([
      new Promise(res => onSnapshot(schoolInfoDocRef, res)),
      new Promise(res => onSnapshot(billingDocRef, res))
    ]).finally(() => setLoading(false));


    return () => {
        unsubscribeSchoolInfo();
        unsubscribeBilling();
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
