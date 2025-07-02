
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
  height?: number;
  weight?: number;
  shoeSize?: number;
  age?: number;
}

// This will be the shape of our document in Firestore
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
      setLoading(true);
      if (authUser) {
        try {
            const userDocRef = doc(db, 'users', authUser.uid);
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
              // New user, create their document in Firestore.
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
            console.error("Firestore error during auth state change:", error);
            // Fallback to authUser data if Firestore fails, this prevents login issues.
            setUser({
              uid: authUser.uid,
              email: authUser.email,
              displayName: authUser.displayName,
              photoURL: authUser.photoURL,
            });
             toast({
              variant: 'destructive',
              title: 'Could not load profile',
              description: 'There was an issue fetching your profile data. Some information may be missing.',
            });
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
      } catch (error: any) {
          console.error("Error signing in with email/password: ", error);
          toast({
            variant: 'destructive',
            title: 'Sign In Failed',
            description: error.message || 'An unexpected error occurred.',
          })
          throw error;
      }
  }
  
  const signUpWithEmailPassword = async (email: string, password: string) => {
      try {
          await createUserWithEmailAndPassword(auth, email, password);
          // After sign up, redirect to profile page to fill details
          router.push('/settings/profile');
      } catch (error: any) {
          console.error("Error signing up with email/password: ", error);
          toast({
            variant: 'destructive',
            title: 'Sign Up Failed',
            description: error.message || 'An unexpected error occurred.',
          })
          throw error;
      }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
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
        toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to update your profile.' });
        return;
    }

    try {
      const { photoDataUrl, ...profileData } = data;
      
      const authUpdates: { displayName?: string; photoURL?: string } = {};
      const firestoreUpdates: Partial<UserDocument> = {};
      
      let newPhotoURL: string | undefined = undefined;

      // 1. Handle Photo Upload
      if (photoDataUrl) {
        const storageRef = ref(storage, `avatars/${currentUser.uid}-${Date.now()}`);
        await uploadString(storageRef, photoDataUrl, 'data_url', { contentType: 'image/jpeg' });
        newPhotoURL = await getDownloadURL(storageRef);
        authUpdates.photoURL = newPhotoURL;
        firestoreUpdates.photoURL = newPhotoURL;
      }

      // 2. Handle other fields, carefully checking for undefined
      if (profileData.displayName !== undefined) {
        authUpdates.displayName = profileData.displayName;
        firestoreUpdates.displayName = profileData.displayName;
      }
      if (profileData.height !== undefined) firestoreUpdates.height = profileData.height;
      if (profileData.weight !== undefined) firestoreUpdates.weight = profileData.weight;
      if (profileData.shoeSize !== undefined) firestoreUpdates.shoeSize = profileData.shoeSize;
      if (profileData.age !== undefined) firestoreUpdates.age = profileData.age;
      
      // 3. Perform updates to Auth and Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      await Promise.all([
          Object.keys(authUpdates).length > 0 ? updateProfile(currentUser, authUpdates) : Promise.resolve(),
          Object.keys(firestoreUpdates).length > 0 ? setDoc(userDocRef, firestoreUpdates, { merge: true }) : Promise.resolve(),
      ]);
      
      // 4. Update local state
      setUser(prevUser => {
        if (!prevUser) return null;
        // Create a new object to ensure React re-renders
        return {
            ...prevUser,
            ...firestoreUpdates,
            ...(newPhotoURL && { photoURL: newPhotoURL }),
            ...(authUpdates.displayName && { displayName: authUpdates.displayName }),
        };
      });

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
