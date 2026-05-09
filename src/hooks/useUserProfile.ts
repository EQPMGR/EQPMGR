// src/hooks/useUserProfile.ts
'use client';

import { useState, useEffect } from 'react';
import { getDb } from '@/backend';

export function useUserProfile(uid: string | undefined) {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      setProfile(null);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const db = await getDb();
        unsubscribe = db.onSnapshot(
          'profiles',
          uid,
          (docSnap) => {
            if (docSnap.exists) {
              setProfile(docSnap.data);
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching user profile:", error);
            setLoading(false);
          }
        );
      } catch (error) {
        console.error("Error initializing profile listener:", error);
        setLoading(false);
      }
    })();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [uid]);

  return { profile, loading };
}