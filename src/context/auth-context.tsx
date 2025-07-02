'use client';

import { createContext, useState, useEffect, ReactNode, FC } from 'react';
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
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInWithEmailPassword: (email: string, password:string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileInfo: (data: Omit<Partial<UserProfile>, 'uid' | 'email' | 'photoURL'>) => Promise<void>;
  updateProfilePhoto: (photoDataUrl: string) => Promise<void>;
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
        try {
          const userDocSnap = await getDoc(userDocRef);
          
          let userProfile: UserProfile = {
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
          };

          if (userDocSnap.exists()) {
            const userDocData = userDocSnap.data() as UserDocument;
            // Merge Firestore data into the profile
            userProfile = { ...userProfile, ...userDocData };
            await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
          } else {
             const initialDoc: UserDocument = { 
              displayName: authUser.displayName,
              photoURL: authUser.photoURL,
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp()
            };
            await setDoc(userDocRef, initialDoc);
          }
           setUser(userProfile);
        } catch (error) {
           console.error("Firestore error during profile fetch:", error);
           toast({
              variant: 'destructive',
              title: 'Could not sync profile',
              description: 'There was an issue fetching your profile data.',
            });
            // Set user with basic info anyway as a fallback
            setUser({
              uid: authUser.uid,
              email: authUser.email,
              displayName: authUser.displayName,
              photoURL: authUser.photoURL,
            });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const signInWithEmailPassword = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    router.push('/');
  };

  const signUpWithEmailPassword = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
    router.push('/settings/profile');
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push('/login');
  };

  const updateProfileInfo = async (data: Omit<Partial<UserProfile>, 'uid' | 'email' | 'photoURL'>) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
          toast({ variant: 'destructive', title: 'Not Authenticated' });
          return;
      }
      
      const authUpdates: { displayName?: string | null } = {};
      if (data.displayName !== undefined) {
          authUpdates.displayName = data.displayName;
      }

      if (Object.keys(authUpdates).length > 0) {
          await updateProfile(currentUser, authUpdates);
      }

      const firestoreUpdates: DocumentData = { ...data };
      // Don't store displayName in Firestore if it's in authUpdates
      if ('displayName' in firestoreUpdates) {
          delete firestoreUpdates.displayName;
      }
      
      if (Object.keys(firestoreUpdates).length > 0) {
          await setDoc(doc(db, 'users', currentUser.uid), firestoreUpdates, { merge: true });
      }

      setUser(prev => prev ? { ...prev, ...data, ...authUpdates } : null);
      toast({ title: "Profile updated!" });
  };

  const updateProfilePhoto = async (photoDataUrl: string) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
          toast({ variant: 'destructive', title: 'Not Authenticated' });
          return;
      }
      
      const storageRef = ref(storage, `avatars/${currentUser.uid}`);
      console.log(`[DEBUG] Starting upload for user ${currentUser.uid} to path ${storageRef.fullPath}`);
      
      const uploadTask = uploadString(storageRef, photoDataUrl, 'data_url');
    
      const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
              reject(new Error('Upload timed out after 15 seconds. Check Storage Rules and network.'));
          }, 15000); 
      });

      await Promise.race([uploadTask, timeoutPromise]);
    
      const newPhotoURL = await getDownloadURL(storageRef);
      console.log('[DEBUG] Got download URL:', newPhotoURL);
    
      await updateProfile(currentUser, { photoURL: newPhotoURL });
      await setDoc(doc(db, 'users', currentUser.uid), { photoURL: newPhotoURL }, { merge: true });
    
      setUser(prev => prev ? { ...prev, photoURL: newPhotoURL } : null);
      toast({ title: 'Photo updated successfully!' });
  };
  
  // This is a wrapper around the core auth functions to provide consistent error handling.
  const authWrapper = <T extends (...args: any[]) => Promise<any>>(fn: T) => async (...args: Parameters<T>): Promise<ReturnType<T> | void> => {
      try {
          return await fn(...args);
      } catch (error: any) {
          console.error(`Auth error in function ${fn.name}:`, error);
          toast({
              variant: 'destructive',
              title: error.code || 'Authentication Error',
              description: error.message || 'An unexpected error occurred.',
          });
          // Re-throwing allows the component to know the operation failed.
          throw error;
      }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Skeleton className="h-[160px] w-[160px] rounded-lg" />
        </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signInWithEmailPassword: authWrapper(signInWithEmailPassword),
      signUpWithEmailPassword: authWrapper(signUpWithEmailPassword),
      signOut: authWrapper(signOut),
      updateProfileInfo: authWrapper(updateProfileInfo),
      updateProfilePhoto: authWrapper(updateProfilePhoto)
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
