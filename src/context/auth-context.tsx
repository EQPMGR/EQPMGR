
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
import { Skeleton } from '@/components/ui/skeleton';
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
  updateProfileInfo: (data: Omit<Partial<UserProfile>, 'uid' | 'email' | 'photoURL'>) => Promise<void>;
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
        // Immediately set a basic user profile to make the app responsive.
        // This stops the main loading skeleton quickly.
        setUser({
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          photoURL: authUser.photoURL,
        });
        
        // Asynchronously fetch and merge detailed profile data from Firestore.
        (async () => {
          const userDocRef = doc(db, 'users', authUser.uid);
          try {
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const userDocData = userDocSnap.data() as UserDocument;
              // Merge Firestore data into the profile, keeping existing state
              setUser(prevUser => ({ ...prevUser!, ...userDocData }));
              await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
            } else {
              const initialDoc: UserDocument = {
                displayName: authUser.displayName,
                photoURL: authUser.photoURL,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
              };
              await setDoc(userDocRef, initialDoc);
            }
          } catch (error) {
            console.error("Firestore error during profile fetch:", error);
            toast({
              variant: 'destructive',
              title: 'Could not sync profile',
              description: 'There was an issue fetching your profile data.',
            });
          } finally {
            setLoading(false);
          }
        })();
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

  const updateProfileInfoHandler = useCallback(async (data: Omit<Partial<UserProfile>, 'uid' | 'email' | 'photoURL'>) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
          toast({ variant: 'destructive', title: 'Not Authenticated' });
          return;
      }
      
      const authUpdates: { displayName?: string | null } = {};
      if (data.displayName !== undefined) {
          authUpdates.displayName = data.displayName;
      }

      const firestoreUpdates: DocumentData = { ...data };
      if (Object.keys(authUpdates).length > 0) {
          await updateProfile(currentUser, authUpdates);
          // Don't store displayName in Firestore if it's in authUpdates
          if ('displayName' in firestoreUpdates) {
              delete firestoreUpdates.displayName;
          }
      }
      
      if (Object.keys(firestoreUpdates).length > 0) {
          await setDoc(doc(db, 'users', currentUser.uid), firestoreUpdates, { merge: true });
      }

      setUser(prev => prev ? { ...prev, ...data, ...authUpdates } : null);
      toast({ title: "Profile updated!" });
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
          toast({
              variant: 'destructive',
              title: error.code || 'Authentication Error',
              description: error.message || 'An unexpected error occurred.',
          });
          throw error;
      }
  }, [toast]);

  const value = useMemo(() => ({
    user, 
    loading, 
    signInWithEmailPassword: authWrapper(signInWithEmailPasswordHandler),
    signUpWithEmailPassword: authWrapper(signUpWithEmailPasswordHandler),
    signOut: authWrapper(signOutHandler),
    updateProfileInfo: authWrapper(updateProfileInfoHandler),
    updateProfilePhoto: updateProfilePhotoHandler
  }), [user, loading, authWrapper, signInWithEmailPasswordHandler, signUpWithEmailPasswordHandler, signOutHandler, updateProfileInfoHandler, updateProfilePhotoHandler]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
