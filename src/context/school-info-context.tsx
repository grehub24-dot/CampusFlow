
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
    const settingsDocRef = doc(db, 'settings', 'school-info');
    const unsubscribe = onSnapshot(
      settingsDocRef,
      (doc) => {
        if (doc.exists()) {
          setSchoolInfo(doc.data() as SchoolInformation);
        } else {
          // Set default information if none exists
          setSchoolInfo({
            schoolName: 'CampusFlow',
            logoUrl: 'https://picsum.photos/40/40',
            address: 'P.O. Box 123, Accra, Ghana',
            phone: '+233 12 345 6789'
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching school info:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
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
