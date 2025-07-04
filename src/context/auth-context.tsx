
'use client';

import { createContext, useState, useEffect, ReactNode, FC, useCallback, useMemo } from 'react';
import type { User } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { doc, getDoc, setDoc, serverTimestamp, deleteField, FieldValue } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, storage, db } from '@/lib/firebase';
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
  measurementSystem: 'metric' | 'imperial';
  shoeSizeSystem: 'us' | 'uk' | 'eu';
  distanceUnit: 'km' | 'miles';
}

interface UserDocument {
    displayName?: string;
    photoURL?: string;
    height?: number;
    weight?: number;
    shoeSize?: number;
    age?: number;
    measurementSystem?: 'metric' | 'imperial';
    shoeSizeSystem?: 'us' | 'uk' | 'eu';
    distanceUnit?: 'km' | 'miles';
    createdAt?: FieldValue;
    lastLogin?: FieldValue;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInWithEmailPassword: (email: string, password:string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileInfo: (data: Omit<Partial<UserProfile>, 'uid' | 'email'>) => Promise<void>;
  updateProfilePhoto: (photoDataUrl: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// This function ensures that the profile object used in the app is always valid.
const createSafeUserProfile = (authUser: User, docData?: Partial<UserDocument>): UserProfile => {
  const data = docData || {};
  return {
    uid: authUser.uid,
    email: authUser.email,
    displayName: authUser.displayName || data.displayName || null,
    photoURL: authUser.photoURL || data.photoURL || null,
    measurementSystem: data.measurementSystem || 'metric',
    shoeSizeSystem: data.shoeSizeSystem || 'us',
    distanceUnit: data.distanceUnit || 'km',
    height: data.height,
    weight: data.weight,
    shoeSize: data.shoeSize,
    age: data.age,
  };
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const handleAuthError = useCallback((error: any, title: string) => {
    console.error(title, error);
    toast({
      variant: 'destructive',
      title: error.code || title,
      description: error.message || 'An unexpected error occurred.',
    });
    throw error;
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      if (authUser) {
        const userDocRef = doc(db, 'users', authUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          let userProfile: UserProfile;

          if (userDocSnap.exists()) {
            const userDocData = userDocSnap.data() as UserDocument;
            userProfile = createSafeUserProfile(authUser, userDocData);
            await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
          } else {
            // New user: Create a complete profile document with defaults
            const newDocData: UserDocument = {
              displayName: authUser.displayName || '',
              photoURL: authUser.photoURL || '',
              measurementSystem: 'metric',
              shoeSizeSystem: 'us',
              distanceUnit: 'km',
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
            };
            await setDoc(userDocRef, newDocData, { merge: true });
            userProfile = createSafeUserProfile(authUser, newDocData);
          }
          setUser(userProfile);

        } catch (error) {
            handleAuthError(error, 'Profile Sync Failed');
            await firebaseSignOut(auth);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [handleAuthError]);

  const signInWithEmailPasswordHandler = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (error) {
      handleAuthError(error, 'Sign In Failed');
    }
  };

  const signUpWithEmailPasswordHandler = async (email: string, password: string) => {
     try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/settings/profile');
    } catch (error) {
      handleAuthError(error, 'Sign Up Failed');
    }
  };

  const signOutHandler = async () => {
    try {
        await firebaseSignOut(auth);
        router.push('/login');
    } catch (error) {
        handleAuthError(error, 'Sign Out Failed');
    }
  };

  const updateProfileInfoHandler = useCallback(async (data: Omit<Partial<UserProfile>, 'uid' | 'email'>) => {
      const currentUser = auth.currentUser;
      if (!currentUser || !user) {
          throw new Error('Not Authenticated');
      }
      
      const userDocRef = doc(db, 'users', currentUser.uid);

      try {
        // 1. Handle displayName update in Firebase Auth, as it's a special case
        if (data.displayName !== undefined && data.displayName !== currentUser.displayName) {
            await updateProfile(currentUser, { displayName: data.displayName });
        }

        // 2. Prepare the document for Firestore.
        const firestoreUpdateData: Partial<UserDocument> = { ...data };

        // 3. Sanitize data: remove any undefined/null values, replacing them with a delete command for Firestore.
        // This is crucial for optional fields like height, weight, etc.
        for (const key in firestoreUpdateData) {
          const typedKey = key as keyof typeof firestoreUpdateData;
          if (firestoreUpdateData[typedKey] === undefined || firestoreUpdateData[typedKey] === null) {
            (firestoreUpdateData as any)[typedKey] = deleteField();
          }
        }
        
        // 4. Save to Firestore
        await setDoc(userDocRef, firestoreUpdateData, { merge: true });

        // 5. Re-fetch and update local state to reflect changes
        const updatedDoc = await getDoc(userDocRef);
        if (updatedDoc.exists()) {
             const userDocData = updatedDoc.data() as UserDocument;
             const safeProfile = createSafeUserProfile(currentUser, userDocData);
             setUser(safeProfile);
        }

        toast({ title: "Profile updated!" });
      } catch (error: any) {
        handleAuthError(error, 'Profile Update Failed');
      }
  }, [user, toast, handleAuthError]);
  
  const updateProfilePhotoHandler = useCallback(async (photoDataUrl: string): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return false;
    }
    const storageRef = ref(storage, `avatars/${currentUser.uid}`);
    try {
        await uploadString(storageRef, photoDataUrl, 'data_url');
        const newPhotoURL = await getDownloadURL(storageRef);
        await updateProfile(currentUser, { photoURL: newPhotoURL });
        await setDoc(doc(db, 'users', currentUser.uid), { photoURL: newPhotoURL }, { merge: true });
        setUser(prev => prev ? { ...prev, photoURL: newPhotoURL } : null);
        toast({ title: 'Photo updated successfully!' });
        return true;
    } catch (error: any) {
        handleAuthError(error, 'Photo Upload Failed');
        return false;
    }
  }, [toast, handleAuthError]);

  const value = useMemo(() => ({
    user, 
    loading, 
    signInWithEmailPassword: signInWithEmailPasswordHandler,
    signUpWithEmailPassword: signUpWithEmailPasswordHandler,
    signOut: signOutHandler,
    updateProfileInfo: updateProfileInfoHandler,
    updateProfilePhoto: updateProfilePhotoHandler,
  }), [user, loading, updateProfileInfoHandler, updateProfilePhotoHandler]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
