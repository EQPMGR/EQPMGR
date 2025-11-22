'use client';

import { createContext, useState, useEffect, ReactNode, FC, useCallback, useMemo } from 'react';
import { getAuth, getDb, getStorage } from '@/backend';
import type { AuthUser, IAuthProvider, IDatabase, IStorage } from '@/backend/interfaces';
import type { UserProfile as BackendUserProfile, UserDocument as BackendUserDocument } from '@/backend/types';
import { useToast } from '@/hooks/use-toast';
import { toDate } from '@/lib/date-utils';

// Re-export UserProfile from backend types for backward compatibility
export type UserProfile = BackendUserProfile;

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  updateProfileInfo: (data: Omit<Partial<UserProfile>, 'uid' | 'email' | 'getIdToken'>) => Promise<void>;
  updateUserPreferences: (prefs: Partial<Pick<UserProfile, 'measurementSystem' | 'shoeSizeSystem' | 'distanceUnit' | 'dateFormat'>>) => Promise<void>;
  updateProfilePhoto: (photoDataUrl: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Convert AuthUser from backend to UserProfile with document data
 */
const createSafeUserProfile = (authUser: AuthUser, docData?: Partial<BackendUserDocument>): UserProfile => {
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
    getIdToken: authUser.getIdToken,
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
        const auth = await getAuth();
        const db = await getDb();

        const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
          if (authUser) {
            const userDocSnap = await db.getDoc<BackendUserDocument>('app_users', authUser.uid);
            let userDocData: BackendUserDocument;

            if (userDocSnap.exists && userDocSnap.data) {
              // Update last login
                const lastLoginPayload = { lastLogin: new Date() };
                try {
                  console.debug('[auth] updateDoc payload (lastLogin):', JSON.stringify(lastLoginPayload));
                } catch (_) {
                  console.debug('[auth] updateDoc payload (lastLogin, raw):', lastLoginPayload);
                }
                await db.updateDoc('app_users', authUser.uid, lastLoginPayload);
                userDocData = userDocSnap.data;
            } else {
              // Create new user document
              userDocData = {
                displayName: authUser.displayName || '',
                photoURL: authUser.photoURL || '',
                measurementSystem: 'imperial',
                shoeSizeSystem: 'us-mens',
                distanceUnit: 'km',
                dateFormat: 'MM/DD/YYYY',
                createdAt: new Date(),
                lastLogin: new Date(),
              };
              try {
                console.debug('[auth] setDoc payload (new user):', JSON.stringify(userDocData));
              } catch (_) {
                console.debug('[auth] setDoc payload (new user, raw):', userDocData);
              }
              await db.setDoc('app_users', authUser.uid, userDocData);
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
        console.error("Backend auth initialization failed:", error);
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
      const auth = await getAuth();
      await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      handleAuthError(error, 'Sign In Failed');
    }
  };

  const signUpWithEmailPasswordHandler = async (email: string, password: string) => {
    try {
      const auth = await getAuth();
      const authUser = await auth.createUserWithEmailAndPassword(email, password);
      await auth.sendEmailVerification(authUser);
      await auth.signOut();

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
      const auth = await getAuth();
      await auth.signOut();
    } catch (error) {
      handleAuthError(error, 'Sign Out Failed');
    }
  }, [handleAuthError]);

  const resendVerificationEmailHandler = async () => {
    try {
      const auth = await getAuth();
      const currentUser = auth.getCurrentUser();

      if (!currentUser) {
        toast({
          variant: 'destructive',
          title: 'Not Logged In',
          description: 'You must be logged in to resend a verification email.'
        });
        return;
      }

      if (currentUser.emailVerified) {
        toast({
          title: 'Already Verified',
          description: 'Your email is already verified.'
        });
        return;
      }

      await auth.sendEmailVerification(currentUser);
      toast({
        title: 'Verification Email Sent',
        description: 'Please check your inbox (and spam folder).'
      });
    } catch (error) {
      handleAuthError(error, 'Failed to send verification email');
    }
  };

  const updateProfileInfoHandler = useCallback(async (data: Omit<Partial<UserProfile>, 'uid' | 'email' | 'getIdToken'>) => {
    const auth = await getAuth();
    const db = await getDb();
    const currentUser = auth.getCurrentUser();

    if (!currentUser) {
      throw new Error('Not Authenticated');
    }

    try {
      // Build update data for database
      const dbUpdateData: Partial<BackendUserDocument> = {};

      if (data.displayName) dbUpdateData.displayName = data.displayName;
      if (data.phone) dbUpdateData.phone = data.phone;
      if (data.height) dbUpdateData.height = data.height;
      if (data.weight) dbUpdateData.weight = data.weight;
      if (data.shoeSize) dbUpdateData.shoeSize = data.shoeSize;
      if (data.birthdate) dbUpdateData.birthdate = data.birthdate;

      // Debug: show db update payload
      try {
        console.debug('[auth] updateProfileInfo dbUpdateData:', JSON.stringify(dbUpdateData));
      } catch (_) {
        console.debug('[auth] updateProfileInfo dbUpdateData (raw):', dbUpdateData);
      }

      // Update auth profile
      await auth.updateProfile(currentUser, {
        displayName: data.displayName || undefined,
        photoURL: data.photoURL || undefined,
      });

      // Update database document
      await db.updateDoc('app_users', currentUser.uid, dbUpdateData);

      // Fetch updated data
      const updatedDocSnap = await db.getDoc<BackendUserDocument>('app_users', currentUser.uid);
      const newSafeProfile = createSafeUserProfile(currentUser, updatedDocSnap.data);
      setUser(newSafeProfile);

      toast({ title: "Profile updated!" });
    } catch (error: any) {
      handleAuthError(error, 'Profile Update Failed');
    }
  }, [toast, handleAuthError]);

  const updateUserPreferencesHandler = useCallback(async (prefs: Partial<Pick<UserProfile, 'measurementSystem' | 'shoeSizeSystem' | 'distanceUnit' | 'dateFormat'>>) => {
    const auth = await getAuth();
    const db = await getDb();
    const currentUser = auth.getCurrentUser();

    if (!currentUser) {
      throw new Error('Not Authenticated');
    }

    try {
      await db.updateDoc('app_users', currentUser.uid, prefs);
      setUser(prevUser => prevUser ? { ...prevUser, ...prefs } : null);
      toast({ title: "Preference saved!" });
    } catch (error) {
      handleAuthError(error, 'Preference Update Failed');
    }
  }, [handleAuthError, toast]);

  const updateProfilePhotoHandler = useCallback(async (photoDataUrl: string): Promise<boolean> => {
    const auth = await getAuth();
    const db = await getDb();
    const storage = await getStorage();
    const currentUser = auth.getCurrentUser();

    if (!currentUser) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return false;
    }

    try {
      const uploadResult = await storage.uploadFromDataURL(`avatars/${currentUser.uid}`, photoDataUrl);
      const newPhotoURL = uploadResult.url;

      await auth.updateProfile(currentUser, { photoURL: newPhotoURL });
      try {
        console.debug('[auth] setDoc payload (photo update):', JSON.stringify({ photoURL: newPhotoURL }));
      } catch (_) {
        console.debug('[auth] setDoc payload (photo update, raw):', { photoURL: newPhotoURL });
      }
      await db.setDoc('app_users', currentUser.uid, { photoURL: newPhotoURL }, true);

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
