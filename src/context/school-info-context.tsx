
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
  const [schoolInfo, setSchoolInfo] = useState<SchoolInformation | null>({
    schoolName: 'CampusFlow',
    currentPlan: 'pro',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const schoolInfoDocRef = doc(db, 'settings', 'school-info');
    const billingDocRef = doc(db, 'settings', 'billing');

    let schoolData: Partial<SchoolInformation> | null = null;
    let billingData: Partial<SchoolInformation> | null = null;
    
    const updateState = () => {
        if (schoolData !== null && billingData !== null) {
            setSchoolInfo({
                ...schoolData,
                ...billingData
            } as SchoolInformation)
        }
    }

    const unsubscribeSchoolInfo = onSnapshot(
      schoolInfoDocRef,
      (doc) => {
        schoolData = doc.data() as SchoolInformation;
        updateState();
      },
      (error) => {
        console.error('Error fetching school info:', error);
      }
    );
    
    const unsubscribeBilling = onSnapshot(
      billingDocRef,
      (doc) => {
        billingData = doc.data() as SchoolInformation;
        updateState();
      },
      (error) => {
        console.error('Error fetching billing info:', error);
      }
    )

    // Initial load check
    Promise.all([
      new Promise(res => onSnapshot(schoolInfoDocRef, doc => { schoolData = doc.data() || {}; res(null) })),
      new Promise(res => onSnapshot(billingDocRef, doc => { billingData = doc.data() || {}; res(null) }))
    ]).finally(() => {
        // Set a default plan if not found in db
        const mergedInfo = { ...schoolData, ...billingData };
        if (!mergedInfo.currentPlan) {
          mergedInfo.currentPlan = 'pro';
        }
        setSchoolInfo(mergedInfo as SchoolInformation);
        setLoading(false)
    });


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
