
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
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, storage, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

// UserProfile is what the components will see and use. It must always be complete.
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  height: number | ''; // can be empty string if not set
  weight: number | ''; // can be empty string if not set
  shoeSize: number | ''; // can be empty string if not set
  age: number | ''; // can be empty string if not set
  measurementSystem: 'metric' | 'imperial';
  shoeSizeSystem: 'us' | 'uk' | 'eu';
  distanceUnit: 'km' | 'miles';
}

// UserDocument represents the shape of the data that might be in Firestore. Fields can be missing.
interface UserDocument {
    displayName?: string;
    photoURL?: string;
    height?: number | '';
    weight?: number | '';
    shoeSize?: number | '';
    age?: number | '';
    measurementSystem?: 'metric' | 'imperial';
    shoeSizeSystem?: 'us' | 'uk' | 'eu';
    distanceUnit?: 'km' | 'miles';
    createdAt?: any;
    lastLogin?: any;
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
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        try {
          const userDocRef = doc(db, 'users', authUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          const defaults = {
            measurementSystem: 'metric' as const,
            shoeSizeSystem: 'us' as const,
            distanceUnit: 'km' as const,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
          };

          if (userDocSnap.exists()) {
            const userDocData = userDocSnap.data() as UserDocument;
            
            const fullProfile: UserProfile = {
              uid: authUser.uid,
              email: authUser.email,
              displayName: userDocData.displayName || defaults.displayName,
              photoURL: userDocData.photoURL || defaults.photoURL,
              height: userDocData.height || '',
              weight: userDocData.weight || '',
              shoeSize: userDocData.shoeSize || '',
              age: userDocData.age || '',
              measurementSystem: userDocData.measurementSystem || defaults.measurementSystem,
              shoeSizeSystem: userDocData.shoeSizeSystem || defaults.shoeSizeSystem,
              distanceUnit: userDocData.distanceUnit || defaults.distanceUnit,
            };
            setUser(fullProfile);

            const dataToUpdate: UserDocument = { lastLogin: serverTimestamp() };
            if (!userDocData.measurementSystem) dataToUpdate.measurementSystem = defaults.measurementSystem;
            if (!userDocData.shoeSizeSystem) dataToUpdate.shoeSizeSystem = defaults.shoeSizeSystem;
            if (!userDocData.distanceUnit) dataToUpdate.distanceUnit = defaults.distanceUnit;
            if (Object.keys(dataToUpdate).length > 1) {
              await updateDoc(userDocRef, dataToUpdate);
            } else {
              await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
            }

          } else {
            // Create a new user doc in firestore with all fields and defaults.
            const dataToSave: UserDocument & { createdAt: any; lastLogin: any } = {
                displayName: defaults.displayName,
                photoURL: defaults.photoURL,
                height: '',
                weight: '',
                shoeSize: '',
                age: '',
                measurementSystem: defaults.measurementSystem,
                shoeSizeSystem: defaults.shoeSizeSystem,
                distanceUnit: defaults.distanceUnit,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
            };
            await setDoc(userDocRef, dataToSave);

            // Create a clean profile object for the app state, without serverTimestamps
            const newProfileForState: UserProfile = {
                 uid: authUser.uid,
                 email: authUser.email,
                 displayName: dataToSave.displayName || null,
                 photoURL: dataToSave.photoURL || null,
                 height: dataToSave.height || '',
                 weight: dataToSave.weight || '',
                 shoeSize: dataToSave.shoeSize || '',
                 age: dataToSave.age || '',
                 measurementSystem: dataToSave.measurementSystem || 'metric',
                 shoeSizeSystem: dataToSave.shoeSizeSystem || 'us',
                 distanceUnit: dataToSave.distanceUnit || 'km'
            };
            setUser(newProfileForState);
          }
        } catch (error) {
             console.error("Firestore error during profile fetch:", error);
            toast({
                variant: 'destructive',
                title: 'Could not sync profile',
                description: 'There was an issue fetching your profile data.',
            });
            await firebaseSignOut(auth);
        } finally {
            setLoading(false);
        }
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
        const { displayName, ...firestoreData } = data;

        if (displayName !== undefined) {
            await updateProfile(currentUser, { displayName });
        }
        
        const dataToSave: UserDocument = { ...firestoreData };
        // Ensure empty strings are saved as such, but undefined values are not.
        if (data.height === undefined) delete (dataToSave as Partial<UserProfile>).height;
        if (data.weight === undefined) delete (dataToSave as Partial<UserProfile>).weight;
        if (data.shoeSize === undefined) delete (dataToSave as Partial<UserProfile>).shoeSize;
        if (data.age === undefined) delete (dataToSave as Partial<UserProfile>).age;

        if (Object.keys(dataToSave).length > 0) {
            await setDoc(userDocRef, dataToSave, { merge: true });
        }

        const updatedDocSnap = await getDoc(userDocRef);
        if (updatedDocSnap.exists()) {
            const updatedData = updatedDocSnap.data() as UserDocument;
            
            const fullProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: updatedData.displayName || currentUser.displayName,
              photoURL: updatedData.photoURL || currentUser.photoURL,
              height: updatedData.height || '',
              weight: updatedData.weight || '',
              shoeSize: updatedData.shoeSize || '',
              age: updatedData.age || '',
              measurementSystem: updatedData.measurementSystem || 'metric',
              shoeSizeSystem: updatedData.shoeSizeSystem || 'us',
              distanceUnit: updatedData.distanceUnit || 'km',
            };

            setUser(fullProfile);
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
