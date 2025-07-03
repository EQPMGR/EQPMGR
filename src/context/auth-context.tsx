
'use client';

import { createContext, useState, useEffect, ReactNode, FC, useMemo, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, DocumentData } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, storage, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

// UserProfile is what the components will see and use.
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  height?: number | '';
  weight?: number | '';
  shoeSize?: number | '';
  age?: number | '';
  measurementSystem?: 'metric' | 'imperial';
  shoeSizeSystem?: 'us' | 'uk' | 'eu';
  distanceUnit?: 'km' | 'miles';
}

// UserDocument is the shape of the data in Firestore.
interface UserDocument {
    height?: number;
    weight?: number;
    shoeSize?: number;
    age?: number;
    photoURL?: string;
    displayName?: string;
    createdAt?: any;
    lastLogin?: any;
    measurementSystem?: 'metric' | 'imperial';
    shoeSizeSystem?: 'us' | 'uk' | 'eu';
    distanceUnit?: 'km' | 'miles';
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

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        const userDocRef = doc(db, 'users', authUser.uid);
        
        getDoc(userDocRef).then(async (userDocSnap) => {
          const defaults = {
            measurementSystem: 'metric' as const,
            shoeSizeSystem: 'us' as const,
            distanceUnit: 'km' as const,
          };

          if (userDocSnap.exists()) {
            const userDocData = userDocSnap.data() as UserDocument;
            
            const fullProfile: UserProfile = {
              uid: authUser.uid,
              email: authUser.email,
              displayName: userDocData.displayName || authUser.displayName,
              photoURL: userDocData.photoURL || authUser.photoURL,
              height: userDocData.height || '',
              weight: userDocData.weight || '',
              shoeSize: userDocData.shoeSize || '',
              age: userDocData.age || '',
              measurementSystem: userDocData.measurementSystem || defaults.measurementSystem,
              shoeSizeSystem: userDocData.shoeSizeSystem || defaults.shoeSizeSystem,
              distanceUnit: userDocData.distanceUnit || defaults.distanceUnit,
            };
            setUser(fullProfile);

            // If any preference was missing, write it back to DB for future sessions
            const dataToUpdate: Partial<UserDocument> = { lastLogin: serverTimestamp() };
            if (!userDocData.measurementSystem) dataToUpdate.measurementSystem = defaults.measurementSystem;
            if (!userDocData.shoeSizeSystem) dataToUpdate.shoeSizeSystem = defaults.shoeSizeSystem;
            if (!userDocData.distanceUnit) dataToUpdate.distanceUnit = defaults.distanceUnit;
            
            await updateDoc(userDocRef, dataToUpdate);

          } else {
            // Create a new user doc with defaults
            const initialDoc: UserDocument = {
                displayName: authUser.displayName,
                photoURL: authUser.photoURL,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                measurementSystem: defaults.measurementSystem,
                shoeSizeSystem: defaults.shoeSizeSystem,
                distanceUnit: defaults.distanceUnit,
            };
            await setDoc(userDocRef, initialDoc);
            setUser({
                 uid: authUser.uid,
                 email: authUser.email,
                ...initialDoc,
            });
          }
        }).catch((error) => {
             console.error("Firestore error during profile fetch:", error);
            toast({
                variant: 'destructive',
                title: 'Could not sync profile',
                description: 'There was an issue fetching your profile data.',
            });
        }).finally(() => {
            setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [toast]);

  const signInWithEmailPasswordHandler = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    router.push('/');
  }, [router]);

  const signUpWithEmailPasswordHandler = useCallback(async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
    router.push('/settings/profile');
  }, [router]);

  const signOutHandler = useCallback(async () => {
    await firebaseSignOut(auth);
    router.push('/login');
  }, [router]);

  const updateProfileInfoHandler = useCallback(async (data: Omit<Partial<UserProfile>, 'uid' | 'email'>) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
          toast({ variant: 'destructive', title: 'Not Authenticated', description: 'Please log in again.' });
          throw new Error('Not Authenticated');
      }
      
      const userDocRef = doc(db, 'users', currentUser.uid);

      try {
        // Separate displayName for Firebase Auth update
        const { displayName, ...firestoreData } = data;

        // Update Firebase Auth profile if displayName is provided
        if (displayName !== undefined) {
            await updateProfile(currentUser, { displayName });
        }
        
        // Update Firestore document with the rest of the data
        if (Object.keys(firestoreData).length > 0) {
            await setDoc(userDocRef, firestoreData, { merge: true });
        }

        // Re-fetch the data from Firestore to ensure consistency
        const updatedDocSnap = await getDoc(userDocRef);
        if (updatedDocSnap.exists()) {
            const updatedData = updatedDocSnap.data() as UserDocument;
            setUser(prev => prev ? { ...prev, ...updatedData, displayName: currentUser.displayName, photoURL: currentUser.photoURL } : null);
            toast({ title: "Profile updated!" });
        } else {
            throw new Error("User document not found after update.");
        }
      } catch (error: any) {
        console.error("Profile update failed:", error);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: error.message || 'Could not save changes.',
        });
        throw error;
      }
  }, [toast]);

  const updateProfilePhotoHandler = useCallback(async (photoDataUrl: string): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return false;
    }

    const storageRef = ref(storage, `avatars/${currentUser.uid}`);
    
    try {
        const uploadTask = uploadString(storageRef, photoDataUrl, 'data_url');

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('The request timed out.')), 15000)
        );

        await Promise.race([uploadTask, timeoutPromise]);
        
        const newPhotoURL = await getDownloadURL(storageRef);
        
        await updateProfile(currentUser, { photoURL: newPhotoURL });
        await setDoc(doc(db, 'users', currentUser.uid), { photoURL: newPhotoURL }, { merge: true });

        setUser(prev => prev ? { ...prev, photoURL: newPhotoURL } : null);
        toast({ title: 'Photo updated successfully!' });
        return true;

    } catch (error: any) {
        console.error("Photo upload failed:", error);
        
        let description = 'An unknown error occurred. Please check the console for details.';
        if (error.code) {
            switch (error.code) {
                case 'storage/unauthorized':
                    description = "Permission denied. Please check your Storage security rules.";
                    break;
                case 'storage/canceled':
                    description = "Upload was canceled.";
                    break;
                default:
                    description = error.message;
            }
        } else if (error.message.includes('timed out')) {
            description = "The request timed out. Check Storage Rules and network."
        }
        
        toast({
            variant: 'destructive',
            title: 'Photo Upload Failed',
            description: description,
        });
        return false;
    }
  }, [toast]);
  
  const authWrapper = useCallback(<T extends (...args: any[]) => Promise<any>>(fn: T) => async (...args: Parameters<T>): Promise<ReturnType<T> | void> => {
      try {
          return await fn(...args);
      } catch (error: any) {
          console.error(`Auth error in function ${fn.name}:`, error);
          if (error.code !== 'auth/cancelled-popup-request') {
            toast({
                variant: 'destructive',
                title: error.code || 'Authentication Error',
                description: error.message || 'An unexpected error occurred.',
            });
          }
          throw error;
      }
  }, [toast]);

  const value = useMemo(() => ({
    user, 
    loading, 
    signInWithEmailPassword: authWrapper(signInWithEmailPasswordHandler),
    signUpWithEmailPassword: authWrapper(signUpWithEmailPasswordHandler),
    signOut: authWrapper(signOutHandler),
    updateProfileInfo: updateProfileInfoHandler,
    updateProfilePhoto: updateProfilePhotoHandler
  }), [user, loading, authWrapper, signInWithEmailPasswordHandler, signUpWithEmailPasswordHandler, signOutHandler, updateProfileInfoHandler, updateProfilePhotoHandler]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
