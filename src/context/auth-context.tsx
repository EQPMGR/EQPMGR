
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
import { useRouter } from 'next/navigation';
import { auth, storage } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: { displayName?: string; photoDataUrl?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
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
      } catch (error) {
          console.error("Error signing in with email/password: ", error);
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
      } catch (error) {
          console.error("Error signing up with email/password: ", error);
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

  const updateUserProfile = async (data: { displayName?: string; photoDataUrl?: string }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const profileUpdates: { displayName?: string; photoURL?: string } = {};

      if (data.displayName) {
        profileUpdates.displayName = data.displayName;
      }

      if (data.photoDataUrl) {
        const storageRef = ref(storage, `avatars/${currentUser.uid}`);
        await uploadString(storageRef, data.photoDataUrl, 'data_url', {
            contentType: 'image/jpeg'
        });
        const downloadUrl = await getDownloadURL(storageRef);
        profileUpdates.photoURL = downloadUrl;
      }

      // Update the profile on Firebase's servers
      await updateProfile(currentUser, profileUpdates);
      
      // Force a reload of the user's data from the server
      await currentUser.reload();
      
      // Get the now-fresh user object
      const freshUser = auth.currentUser;

      // Update the state with a shallow clone of the fresh user object to trigger a re-render
      setUser(freshUser ? { ...freshUser } : null);

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
        <div className="flex items-center justify-center min-h-screen">
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
