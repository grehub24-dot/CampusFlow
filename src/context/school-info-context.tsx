
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SchoolInformation } from '@/types';
import { v4 as uuidv4 } from 'uuid';

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
    systemId: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const schoolInfoDocRef = doc(db, 'settings', 'school-info');
    const billingDocRef = doc(db, 'settings', 'billing');

    const updateState = (
      schoolData: Partial<SchoolInformation>,
      billingData: Partial<SchoolInformation>
    ) => {
      let mergedInfo = { ...schoolData, ...billingData } as SchoolInformation;
      if (!mergedInfo.systemId) {
        // Generate and save a new systemId if it doesn't exist
        const newId = `cf-${uuidv4().substring(0, 4)}-${uuidv4().substring(0, 4)}`;
        mergedInfo.systemId = newId;
        setDoc(schoolInfoDocRef, { systemId: newId }, { merge: true });
      }
      setSchoolInfo(mergedInfo);
    };

    const unsubscribeSchoolInfo = onSnapshot(schoolInfoDocRef, (doc) => {
        const schoolData = doc.data() || {};
        onSnapshot(billingDocRef, (billingDoc) => {
            const billingData = billingDoc.data() || {};
            updateState(schoolData, billingData);
            setLoading(false);
        });
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
