
'use client';

import { createContext, useState, useEffect, ReactNode, FC, useCallback, useMemo } from 'react';
import type { User } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { doc, getDoc, setDoc, serverTimestamp, deleteField, FieldValue, updateDoc, writeBatch, collection, getDocs, query } from 'firebase/firestore';
import { auth, storage, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  phone?: string | null;
  photoURL: string | null;
  height?: number; 
  weight?: number; 
  shoeSize?: number; 
  age?: number; 
  measurementSystem: 'metric' | 'imperial';
  shoeSizeSystem: 'us' | 'uk' | 'eu';
  distanceUnit: 'km' | 'miles';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY/MM/DD';
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}

interface UserDocument {
    displayName?: string;
    phone?: string;
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
  resendVerificationEmail: () => Promise<void>;
  updateProfileInfo: (data: Omit<Partial<UserProfile>, 'uid' | 'email' | 'getIdToken'>) => Promise<void>;
  updateUserPreferences: (prefs: Partial<Pick<UserProfile, 'measurementSystem' | 'shoeSizeSystem' | 'distanceUnit' | 'dateFormat'>>) => Promise<void>;
  updateProfilePhoto: (photoDataUrl: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const createSafeUserProfile = (authUser: User, docData?: Partial<UserDocument>): UserProfile => {
  const data = docData || {};
  return {
    uid: authUser.uid,
    email: authUser.email,
    emailVerified: authUser.emailVerified,
    displayName: authUser.displayName || data.displayName || null,
    phone: data.phone || null,
    photoURL: authUser.photoURL || data.photoURL || null,
    measurementSystem: data.measurementSystem || 'imperial',
    shoeSizeSystem: data.shoeSizeSystem || 'us',
    distanceUnit: data.distanceUnit || 'km',
    dateFormat: data.dateFormat || 'MM/DD/YYYY',
    height: data.height,
    weight: data.weight,
    shoeSize: data.shoeSize,
    age: data.age,
    getIdToken: (forceRefresh?: boolean) => authUser.getIdToken(forceRefresh),
  };
};

const setSessionCookie = async (user: User) => {
    // Force a token refresh to ensure we have a valid token.
    const idToken = await user.getIdToken(true);
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set session cookie.');
    }
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
        try {
            // Attempt to set the session cookie with a fresh token
            await setSessionCookie(authUser);

            const userDocRef = doc(db, 'users', authUser.uid);
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

        } catch (error: any) {
            // If setting the session fails (e.g., stale token), sign the user out
            // to clear the invalid client-side state.
            console.error("Session creation failed, forcing logout:", error.message);
            toast({
              variant: 'destructive',
              title: 'Session Expired',
              description: 'Your session has expired. Please sign in again.',
            });
            await firebaseSignOut(auth);
            setUser(null);
            await clearSessionCookie();
        }
      } else {
        // User is logged out.
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  const signInWithEmailPasswordHandler = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      handleAuthError(error, 'Sign In Failed');
    }
  };

  const signUpWithEmailPasswordHandler = async (email: string, password: string) => {
    try {
     const userCredential = await createUserWithEmailAndPassword(auth, email, password);
     await sendEmailVerification(userCredential.user);
     toast({
       title: 'Account Created!',
       description: "You have successfully signed up. Please check your email to verify your account.",
     })
   } catch (error) {
     handleAuthError(error, 'Sign Up Failed');
   }
 };

  const signOutHandler = async () => {
    try {
        await firebaseSignOut(auth);
        await clearSessionCookie();
    } catch (error) {
        handleAuthError(error, 'Sign Out Failed');
    }
  };
  
  const resendVerificationEmailHandler = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to resend a verification email.' });
      return;
    }
    if (currentUser.emailVerified) {
       toast({ title: 'Already Verified', description: 'Your email is already verified.' });
       return;
    }
    try {
      await sendEmailVerification(currentUser);
      toast({ title: 'Verification Email Sent', description: 'Please check your inbox (and spam folder).' });
    } catch (error) {
      handleAuthError(error, 'Failed to send verification email');
    }
  };


  const updateProfileInfoHandler = useCallback(async (data: Omit<Partial<UserProfile>, 'uid' | 'email' | 'getIdToken'>) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
          throw new Error('Not Authenticated');
      }
      
      const userDocRef = doc(db, 'users', currentUser.uid);

      try {
        // Sync with Firebase Auth service
        await updateProfile(currentUser, {
            displayName: data.displayName || undefined,
            photoURL: data.photoURL || undefined,
        });

        // Sync with Firestore document
        const firestoreUpdateData: { [key: string]: any } = {};
        for (const key in data) {
            const typedKey = key as keyof typeof data;
            let value = data[typedKey];
            
            // This logic correctly handles 0 as a valid value
            if (value === null || value === undefined || value === '') {
                firestoreUpdateData[key] = deleteField();
            } else {
                firestoreUpdateData[key] = value;
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
    resendVerificationEmail: resendVerificationEmailHandler,
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
