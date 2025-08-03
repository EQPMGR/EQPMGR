
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
import { doc, getDoc, setDoc, serverTimestamp, deleteField, FieldValue, updateDoc, writeBatch, collection, getDocs, query } from 'firebase/firestore';
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
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY/MM/DD';
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
    dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY/MM/DD';
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
  updateUserPreferences: (prefs: Partial<Pick<UserProfile, 'measurementSystem' | 'shoeSizeSystem' | 'distanceUnit' | 'dateFormat'>>) => Promise<void>;
  updateProfilePhoto: (photoDataUrl: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const createSafeUserProfile = (authUser: User, docData?: Partial<UserDocument>): UserProfile => {
  const data = docData || {};
  return {
    uid: authUser.uid,
    email: authUser.email,
    displayName: authUser.displayName || data.displayName || null,
    photoURL: authUser.photoURL || data.photoURL || null,
    measurementSystem: data.measurementSystem || 'imperial',
    shoeSizeSystem: data.shoeSizeSystem || 'us',
    distanceUnit: data.distanceUnit || 'km',
    dateFormat: data.dateFormat || 'MM/DD/YYYY',
    height: data.height,
    weight: data.weight,
    shoeSize: data.shoeSize,
    age: data.age,
  };
};

const setSessionCookie = async (user: User) => {
    const idToken = await user.getIdToken();
    await fetch('/api/auth/session', {
      method: 'POST',
      body: idToken,
    });
};

const clearSessionCookie = async () => {
    await fetch('/api/auth/session', {
      method: 'DELETE',
    });
}

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
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
          await setSessionCookie(authUser);
          const userDocSnap = await getDoc(userDocRef);
          let userDocData: UserDocument;
          
          if (userDocSnap.exists()) {
            await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
            userDocData = userDocSnap.data() as UserDocument;
          } else {
            userDocData = {
              displayName: authUser.displayName || '',
              photoURL: authUser.photoURL || '',
              measurementSystem: 'imperial',
              shoeSizeSystem: 'us',
              distanceUnit: 'km',
              dateFormat: 'MM/DD/YYYY',
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
            };
            await setDoc(userDocRef, userDocData);
          }
          
          const safeProfile = createSafeUserProfile(authUser, userDocData);
          setUser(safeProfile);

        } catch (error) {
            handleAuthError(error, 'Profile Sync Failed');
            await firebaseSignOut(auth);
        }
      } else {
        setUser(null);
        await clearSessionCookie();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [handleAuthError]);

  const signInWithEmailPasswordHandler = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      handleAuthError(error, 'Sign In Failed');
    }
  };

  const signUpWithEmailPasswordHandler = async (email: string, password: string) => {
     try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      handleAuthError(error, 'Sign Up Failed');
    }
  };

  const signOutHandler = async () => {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        handleAuthError(error, 'Sign Out Failed');
    }
  };

  const updateProfileInfoHandler = useCallback(async (data: Omit<Partial<UserProfile>, 'uid' | 'email'>) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
          throw new Error('Not Authenticated');
      }
      
      const userDocRef = doc(db, 'users', currentUser.uid);

      try {
        if (data.displayName !== undefined && data.displayName !== currentUser.displayName) {
            await updateProfile(currentUser, { displayName: data.displayName });
        }

        const firestoreUpdateData: { [key: string]: any } = {};
        for (const key in data) {
            const typedKey = key as keyof typeof data;
            const value = data[typedKey];
            if (value !== undefined && value !== null && value !== '') {
                firestoreUpdateData[key] = value;
            } else {
                firestoreUpdateData[key] = deleteField();
            }
        }
        
        await updateDoc(userDocRef, firestoreUpdateData);

        const updatedDoc = await getDoc(userDocRef);
        const newSafeProfile = createSafeUserProfile(currentUser, updatedDoc.data());
        setUser(newSafeProfile);

        toast({ title: "Profile updated!" });
      } catch (error: any) {
        handleAuthError(error, 'Profile Update Failed');
      }
  }, [toast, handleAuthError]);

  const updateUserPreferencesHandler = useCallback(async (prefs: Partial<Pick<UserProfile, 'measurementSystem' | 'shoeSizeSystem' | 'distanceUnit' | 'dateFormat'>>) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
          throw new Error('Not Authenticated');
      }

      const userDocRef = doc(db, 'users', currentUser.uid);

      try {
          await updateDoc(userDocRef, prefs);
          setUser(prevUser => prevUser ? { ...prevUser, ...prefs } : null);
          toast({ title: "Preference saved!" });
      } catch (error) {
          handleAuthError(error, 'Preference Update Failed');
      }
  }, [handleAuthError, toast]);
  
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
    updateUserPreferences: updateUserPreferencesHandler,
    updateProfilePhoto: updateProfilePhotoHandler,
  }), [user, loading, updateProfileInfoHandler, updateUserPreferencesHandler, updateProfilePhotoHandler]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
