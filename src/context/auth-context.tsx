
'use client';

import { createContext, useState, useEffect, ReactNode, FC } from 'react';
import type { User } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

interface UserDocument {
    height?: number;
    weight?: number;
    shoeSize?: number;
    age?: number;
    photoURL?: string;
    displayName?: string;
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
      try {
        if (authUser) {
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
          } else {
            // New user signed up, create their document in Firestore.
            const initialDoc: UserDocument = { 
              displayName: authUser.displayName,
              photoURL: authUser.photoURL,
            };
            await setDoc(userDocRef, initialDoc);
            setUser(baseProfile);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
          console.error("Error during authentication state change:", error);
          setUser(null); // Set to null on error to avoid broken states
      } finally {
          setLoading(false);
      }
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
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          if (userCredential.user.metadata.creationTime === userCredential.user.metadata.lastSignInTime) {
            router.push('/settings/profile');
          } else {
            router.push('/');
          }
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
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile> & { photoDataUrl?: string }) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !user) return;

    try {
      const { photoDataUrl, ...profileData } = data;
      
      const authUpdates: { displayName?: string; photoURL?: string; } = {};
      const firestoreUpdates: Partial<UserDocument> = { ...profileData };

      if (photoDataUrl) {
        const storageRef = ref(storage, `avatars/${currentUser.uid}`);
        await uploadString(storageRef, photoDataUrl, 'data_url', { contentType: 'image/jpeg' });
        const downloadUrl = await getDownloadURL(storageRef);
        
        authUpdates.photoURL = downloadUrl;
        firestoreUpdates.photoURL = downloadUrl;
      }

      if (profileData.displayName && profileData.displayName !== user.displayName) {
        authUpdates.displayName = profileData.displayName;
      }
      
      // Perform updates
      await updateProfile(currentUser, authUpdates);
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, firestoreUpdates, { merge: true });

      // Optimistic UI update: create a new object to trigger React's re-render
      setUser(prevUser => ({
        ...prevUser!,
        ...firestoreUpdates,
        ...authUpdates,
      }));

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
