

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
import { doc, getDoc, setDoc, serverTimestamp, deleteField, FieldValue, updateDoc, writeBatch, collection, getDocs, query, Timestamp } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { toDate } from '@/lib/date-utils';

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
  birthdate?: Date | null;
  measurementSystem: 'metric' | 'imperial';
  shoeSizeSystem: 'us-womens' | 'us-mens' | 'uk' | 'eu';
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
    birthdate?: Timestamp;
    measurementSystem?: 'metric' | 'imperial';
    shoeSizeSystem?: 'us-womens' | 'us-mens' | 'uk' | 'eu';
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
    shoeSizeSystem: data.shoeSizeSystem || 'us-mens',
    distanceUnit: data.distanceUnit || 'km',
    dateFormat: data.dateFormat || 'MM/DD/YYYY',
    height: data.height,
    weight: data.weight,
    shoeSize: data.shoeSize,
    birthdate: data.birthdate ? toDate(data.birthdate) : null,
    getIdToken: (forceRefresh?: boolean) => authUser.getIdToken(forceRefresh),
  };
};

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
    const initializeAuth = async () => {
        try {
            const { auth, db } = await getFirebaseServices();
            const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
              if (authUser) {
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
                      shoeSizeSystem: 'us-mens',
                      distanceUnit: 'km',
                      dateFormat: 'MM/DD/YYYY',
                      createdAt: serverTimestamp(),
                      lastLogin: serverTimestamp(),
                    };
                    await setDoc(userDocRef, userDocData);
                  }
                  
                  const safeProfile = createSafeUserProfile(authUser, userDocData);
                  setUser(safeProfile);
              } else {
                setUser(null);
              }
              setLoading(false);
            });
            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase auth initialization failed:", error);
            setLoading(false);
            toast({
                variant: 'destructive',
                title: 'Application Error',
                description: 'Could not initialize required services. Please refresh the page.',
            });
        }
    };
    initializeAuth();
  }, [toast]);

  const signInWithEmailPasswordHandler = async (email: string, password: string) => {
    try {
      const { auth } = await getFirebaseServices();
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      handleAuthError(error, 'Sign In Failed');
    }
  };

  const signUpWithEmailPasswordHandler = async (email: string, password: string) => {
    try {
      const { auth } = await getFirebaseServices();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      await firebaseSignOut(auth);

      toast({
        title: 'Account Created!',
        description: "Please check your inbox to verify your email, then sign in.",
        duration: 9000,
      });

   } catch (error) {
     handleAuthError(error, 'Sign Up Failed');
   }
 };

  const signOutHandler = useCallback(async () => {
    try {
        const { auth } = await getFirebaseServices();
        await firebaseSignOut(auth);
    } catch (error) {
        handleAuthError(error, 'Sign Out Failed');
    }
  }, [handleAuthError]);
  
  const resendVerificationEmailHandler = async () => {
    try {
        const { auth } = await getFirebaseServices();
        const currentUser = auth.currentUser;
        if (!currentUser) {
          toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to resend a verification email.' });
          return;
        }
        if (currentUser.emailVerified) {
           toast({ title: 'Already Verified', description: 'Your email is already verified.' });
           return;
        }
        await sendEmailVerification(currentUser);
        toast({ title: 'Verification Email Sent', description: 'Please check your inbox (and spam folder).' });
    } catch (error) {
        handleAuthError(error, 'Failed to send verification email');
    }
  };


  const updateProfileInfoHandler = useCallback(async (data: Omit<Partial<UserProfile>, 'uid' | 'email' | 'getIdToken'>) => {
      const { auth, db } = await getFirebaseServices();
      const currentUser = auth.currentUser;
      if (!currentUser) {
          throw new Error('Not Authenticated');
      }
      
      const userDocRef = doc(db, 'users', currentUser.uid);

      try {
        await updateProfile(currentUser, {
            displayName: data.displayName || undefined,
            photoURL: data.photoURL || undefined,
        });

        const firestoreUpdateData: { [key: string]: any } = {};
        for (const key in data) {
            const typedKey = key as keyof typeof data;
            let value = data[typedKey];
            
            // Correctly handle fields that should be deleted if empty/null/undefined
            if (value === undefined || value === '' || value === null) {
                // For 'birthdate', we explicitly want to allow null to be stored
                if (key === 'birthdate' && value === null) {
                    firestoreUpdateData[key] = null;
                } else {
                    firestoreUpdateData[key] = deleteField();
                }
            } else if (value instanceof Date) {
                firestoreUpdateData[key] = Timestamp.fromDate(value);
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
      const { auth, db } = await getFirebaseServices();
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
    const { auth, db, storage } = await getFirebaseServices();
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
  }), [user, loading, updateProfileInfoHandler, updateUserPreferencesHandler, updateProfilePhotoHandler, signOutHandler]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };

