import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  auth,
  db,
  signInWithGoogle as firebaseGoogleSignIn,
  signInWithEmailPassword as firebaseEmailSignIn,
  signUpWithEmailPassword as firebaseEmailSignUp,
  signOutUser as firebaseSignOut,
} from '../firebase/config';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isAnonymous?: boolean;
  providerData?: { providerId: string; email?: string | null }[];
  isGoogle?: boolean;
}

interface AuthContextType {
  user: User | AppUser | null;
  loading: boolean;
  isGoogleUser: boolean;
  isEmailUser: boolean;
  signInWithGoogle: () => Promise<User | null>;
  signInWithEmailPassword: (email: string, password: string) => Promise<User | null>;
  signUpWithEmailPassword: (email: string, password: string, displayName?: string) => Promise<User | null>;
  signInWithSimpleEmail: (email: string, displayName?: string) => Promise<AppUser>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isGoogleUser: false,
  isEmailUser: false,
  signInWithGoogle: async () => null,
  signInWithEmailPassword: async () => null,
  signUpWithEmailPassword: async () => null,
  signInWithSimpleEmail: async () => ({} as AppUser),
  signOutUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync authenticated user into Firestore `users` collection
  const syncUserToFirestore = async (fbUser: User | AppUser, isGoogle: boolean) => {
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      await setDoc(
        userRef,
        {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Verified Citizen',
          photoURL: fbUser.photoURL || null,
          isGoogleVerified: isGoogle,
          isEmailVerified: !isGoogle && Boolean(fbUser.email),
          lastActiveAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Could not sync user profile to Firestore:', e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && !currentUser.isAnonymous) {
        setUser(currentUser);
        setLoading(false);
        const isGoogle = currentUser.providerData.some(
          (p) => p.providerId === 'google.com' || p.providerId === 'google'
        );
        await syncUserToFirestore(currentUser, isGoogle);
      } else {
        // Check if an email resident citizen was previously signed in
        const storedEmailUser = localStorage.getItem('civicpulse_email_user');
        if (storedEmailUser) {
          try {
            const parsed = JSON.parse(storedEmailUser);
            if (parsed?.uid && parsed?.email) {
              setUser(parsed);
            } else {
              setUser(null);
            }
          } catch (e) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const isGoogleUser = Boolean(
    user &&
    !user.isAnonymous &&
    ((user as any).isGoogle ||
      user.providerData?.some((p) => p.providerId === 'google.com' || p.providerId === 'google'))
  );

  const isEmailUser = Boolean(user && !isGoogleUser && Boolean(user.email));

  const signInWithGoogle = async (): Promise<User | null> => {
    try {
      localStorage.removeItem('civicpulse_email_user');
      const loggedUser = await firebaseGoogleSignIn();
      if (loggedUser) {
        setUser(loggedUser);
        await syncUserToFirestore(loggedUser, true);
      }
      return loggedUser;
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        console.info('Google sign-in popup dismissed by user');
        return null;
      }
      console.error('Google Sign-in failed:', err);
      throw err;
    }
  };

  const signInWithEmailPassword = async (email: string, pass: string): Promise<User | null> => {
    localStorage.removeItem('civicpulse_email_user');
    const loggedUser = await firebaseEmailSignIn(email, pass);
    if (loggedUser) {
      setUser(loggedUser);
      await syncUserToFirestore(loggedUser, false);
    }
    return loggedUser;
  };

  const signUpWithEmailPassword = async (
    email: string,
    pass: string,
    displayName?: string
  ): Promise<User | null> => {
    localStorage.removeItem('civicpulse_email_user');
    const newUser = await firebaseEmailSignUp(email, pass, displayName);
    if (newUser) {
      setUser(newUser);
      await syncUserToFirestore(newUser, false);
    }
    return newUser;
  };

  const signInWithSimpleEmail = async (email: string, displayName?: string): Promise<AppUser> => {
    const cleanEmail = email.trim().toLowerCase();
    const name = displayName?.trim() || cleanEmail.split('@')[0];

    // Compute consistent citizen ID
    let hash = 0;
    for (let i = 0; i < cleanEmail.length; i++) {
      hash = (hash << 5) - hash + cleanEmail.charCodeAt(i);
      hash |= 0;
    }
    const cleanUid = 'citizen_' + Math.abs(hash).toString(36) + '_' + cleanEmail.replace(/[^a-z0-9]/g, '').slice(0, 10);

    const citizenUser: AppUser = {
      uid: cleanUid,
      email: cleanEmail,
      displayName: name,
      photoURL: null,
      isGoogle: false,
      providerData: [{ providerId: 'password', email: cleanEmail }],
    };

    localStorage.setItem('civicpulse_email_user', JSON.stringify(citizenUser));
    setUser(citizenUser);
    await syncUserToFirestore(citizenUser, false);
    return citizenUser;
  };

  const signOutUser = async (): Promise<void> => {
    try {
      localStorage.removeItem('civicpulse_email_user');
      await firebaseSignOut();
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGoogleUser,
        isEmailUser,
        signInWithGoogle,
        signInWithEmailPassword,
        signUpWithEmailPassword,
        signInWithSimpleEmail,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
