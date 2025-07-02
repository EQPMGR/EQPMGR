
'use client';

import { createContext, useState, useEffect, ReactNode, FC } from 'react';
import type { User } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, storage, db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  height?: number;
  weight?: number;
  shoeSize?: number;
  age?: number;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile> & { photoDataUrl?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userDocRef = doc(db, 'users', authUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setUser({
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
            ...userDocSnap.data()
          });
        } else {
          const newUserProfile: UserProfile = {
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
          };
          await setDoc(userDocRef, newUserProfile, { merge: true });
          setUser(newUserProfile);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    router.push('/');
  }
  
  const signInWithEmailPassword = async (email: string, password: string) => {
      try {
          await signInWithEmailAndPassword(auth, email, password);
          handleAuthSuccess();
      } catch (error) {
          console.error("Error signing in with email/password: ", error);
          throw error;
      }
  }
  
  const signUpWithEmailPassword = async (email: string, password: string) => {
      try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          if (userCredential.user.metadata.creationTime === userCredential.user.metadata.lastSignInTime) {
            router.push('/settings/profile');
          } else {
            router.push('/');
          }
      } catch (error) {
          console.error("Error signing up with email/password: ", error);
          throw error;
      }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile> & { photoDataUrl?: string }) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !user) return;

    try {
      const { photoDataUrl, ...profileData } = data;
      const updates: Partial<UserProfile> = { ...profileData };

      const authProfileUpdates: { displayName?: string; photoURL?: string; } = {};

      if (profileData.displayName && profileData.displayName !== user.displayName) {
        authProfileUpdates.displayName = profileData.displayName;
      }

      if (photoDataUrl) {
        const storageRef = ref(storage, `avatars/${currentUser.uid}`);
        await uploadString(storageRef, photoDataUrl, 'data_url', { contentType: 'image/jpeg' });
        const downloadUrl = await getDownloadURL(storageRef);
        updates.photoURL = downloadUrl;
        authProfileUpdates.photoURL = downloadUrl;
      }

      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, updates, { merge: true });
      
      if (Object.keys(authProfileUpdates).length > 0) {
        await updateProfile(currentUser, authProfileUpdates);
      }

      setUser({ ...user, ...updates });

      toast({
        title: "Profile updated!",
        description: "Your changes have been saved successfully.",
      });

    } catch (error: any) {
      console.error("Error updating profile: ", error);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error.message || 'Could not update your profile.',
      });
    }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Skeleton className="h-[160px] w-[160px] rounded-lg" />
        </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signInWithEmailPassword,
      signUpWithEmailPassword,
      signOut,
      updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
