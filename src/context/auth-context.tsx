
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
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        // Set basic user profile immediately. App is now usable.
        const baseProfile: UserProfile = {
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          photoURL: authUser.photoURL,
          height: '',
          weight: '',
          shoeSize: '',
          age: ''
        };
        setUser(baseProfile);
        setLoading(false); // Make the app interactive immediately

        // Asynchronously try to get the full profile from Firestore.
        // This will not block the UI.
        const fetchFullProfile = async () => {
          try {
            const userDocRef = doc(db, 'users', authUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const userDocData = userDocSnap.data() as UserDocument;
              // Merge the full profile into the existing state
              setUser(prevUser => ({ ...prevUser!, ...userDocData }));
              await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
            } else {
              // If doc doesn't exist, create it with basic info.
              const initialDoc: UserDocument = { 
                displayName: authUser.displayName,
                photoURL: authUser.photoURL,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
              };
              await setDoc(userDocRef, initialDoc, { merge: true });
            }
          } catch (error) {
            console.error("Firestore error during profile fetch:", error);
            toast({
              variant: 'destructive',
              title: 'Could not sync profile',
              description: 'You appear to be offline. Some data may not be up to date.',
            });
          }
        };
        
        fetchFullProfile();

      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [toast]);

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

      if (photoDataUrl) {
        // Simplified filename to just be the user's UID. Easier to debug with security rules.
        const storageRef = ref(storage, `avatars/${currentUser.uid}`);
        await uploadString(storageRef, photoDataUrl, 'data_url', { contentType: 'image/jpeg' });
        newPhotoURL = await getDownloadURL(storageRef);
        authUpdates.photoURL = newPhotoURL;
        firestoreUpdates.photoURL = newPhotoURL;
      }

      if (profileData.displayName !== undefined) {
        authUpdates.displayName = profileData.displayName;
      }

      const finalFirestoreUpdates: Partial<UserDocument> = { ...firestoreUpdates };
      // Only add fields to Firestore update if they are not undefined
      Object.keys(profileData).forEach(key => {
        const K = key as keyof typeof profileData;
        if (profileData[K] !== undefined) {
          finalFirestoreUpdates[K as keyof UserDocument] = profileData[K] as any;
        }
      });
      
      const userDocRef = doc(db, 'users', currentUser.uid);
      await Promise.all([
          Object.keys(authUpdates).length > 0 ? updateProfile(currentUser, authUpdates) : Promise.resolve(),
          Object.keys(finalFirestoreUpdates).length > 0 ? setDoc(userDocRef, finalFirestoreUpdates, { merge: true }) : Promise.resolve(),
      ]);
      
      setUser(prevUser => {
        if (!prevUser) return null;
        const updatedUser = { ...prevUser, ...finalFirestoreUpdates, ...authUpdates };
        return { ...updatedUser };
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
        description: `Could not update your profile. Firebase error: ${error.code}`,
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
