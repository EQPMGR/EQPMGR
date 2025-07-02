
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
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, storage, db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

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
        try {
          const userDocSnap = await getDoc(userDocRef);
          const baseProfile: UserProfile = {
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
          };

          if (userDocSnap.exists()) {
            const userDocData = userDocSnap.data() as UserDocument;
            setUser({ ...baseProfile, ...userDocData });
            await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
          } else {
            // Create the doc if it doesn't exist
            const initialDoc: UserDocument = { 
              displayName: authUser.displayName,
              photoURL: authUser.photoURL,
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp()
            };
            await setDoc(userDocRef, initialDoc);
            setUser(baseProfile);
          }
        } catch (error) {
           console.error("Firestore error during profile fetch:", error);
           toast({
              variant: 'destructive',
              title: 'Could not sync profile',
              description: 'There was an issue fetching your profile data.',
            });
            // Set user with basic info anyway
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
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: error.message || 'An unexpected error occurred.',
      });
      throw error;
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/settings/profile');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error.message || 'An unexpected error occurred.',
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sign Out Failed',
        description: 'An unexpected error occurred while signing out.',
      });
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile> & { photoDataUrl?: string }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }

    const { photoDataUrl, ...profileData } = data;
    
    // Only handle photo upload to isolate the issue
    if (photoDataUrl) {
      const storageRef = ref(storage, `avatars/${currentUser.uid}`);
      console.log(`[DEBUG] Starting upload for user ${currentUser.uid} to path ${storageRef.fullPath}`);
      
      try {
        const uploadTask = uploadString(storageRef, photoDataUrl, 'data_url');
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.error("[DEBUG] Upload promise timed out after 15 seconds.");
            reject(new Error('Upload timed out. Check Storage Rules and network.'));
          }, 15000);
        });

        await Promise.race([uploadTask, timeoutPromise]);
        console.log('[DEBUG] Upload successful.');
        
        const newPhotoURL = await getDownloadURL(storageRef);
        console.log('[DEBUG] Got download URL:', newPhotoURL);
        
        await updateProfile(currentUser, { photoURL: newPhotoURL });
        await setDoc(doc(db, 'users', currentUser.uid), { photoURL: newPhotoURL }, { merge: true });
        
        setUser(prev => prev ? { ...prev, photoURL: newPhotoURL } : null);
        toast({ title: 'Photo updated!' });

      } catch (error: any) {
        console.error('[DEBUG] Caught an error during upload process:', error);
        toast({
          variant: 'destructive',
          title: 'Photo Upload Failed',
          description: error.message || 'An unknown error occurred.',
        });
      }
    } else if (Object.keys(profileData).length > 0) {
        // Handle other profile data updates
        try {
            const authUpdates: { displayName?: string } = {};
            if (profileData.displayName !== undefined) {
                authUpdates.displayName = profileData.displayName;
            }

            const firestoreUpdates: Partial<UserDocument> = { ...profileData };
            
            // Remove displayName from firestore updates if it exists to avoid redundancy
            if ('displayName' in firestoreUpdates) {
                delete firestoreUpdates.displayName;
            }

            await Promise.all([
                Object.keys(authUpdates).length > 0 ? updateProfile(currentUser, authUpdates) : Promise.resolve(),
                Object.keys(firestoreUpdates).length > 0 ? setDoc(doc(db, 'users', currentUser.uid), firestoreUpdates, { merge: true }) : Promise.resolve(),
            ]);

            setUser(prev => prev ? { ...prev, ...profileData } : null);
            toast({ title: "Profile updated!" });
        } catch(error: any) {
            console.error('[DEBUG] Caught an error during profile data update:', error);
            toast({
              variant: 'destructive',
              title: 'Profile Update Failed',
              description: error.message || 'An unknown error occurred.',
            });
        }
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
