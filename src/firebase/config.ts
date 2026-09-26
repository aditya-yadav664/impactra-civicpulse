import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  User,
} from 'firebase/auth';
import firebaseAppletConfig from '../../firebase-applet-config.json';

// Authoritative Firebase Configuration from provisioned applet
const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  projectId: firebaseAppletConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId,
};

export const databaseId = firebaseAppletConfig.firestoreDatabaseId;
export const oAuthClientId = firebaseAppletConfig.oAuthClientId;

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use the specific provisioned Firestore database ID
export const db = getFirestore(app, databaseId);
export const storage = getStorage(app);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Sign in using Google OAuth with automatic fallback
 */
export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    const code = err?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      console.info('Google sign-in popup dismissed by user');
      return null;
    }

    console.warn('Firebase popup encountered notice, trying Google Identity Services fallback...', err);

    // Fallback: Google Identity Services (GIS) token client -> Firebase signInWithCredential
    const gWindow = window as any;
    if (gWindow.google?.accounts?.oauth2 && oAuthClientId) {
      return new Promise<User | null>((resolve, reject) => {
        try {
          const client = gWindow.google.accounts.oauth2.initTokenClient({
            client_id: oAuthClientId,
            scope: 'email profile openid',
            callback: async (tokenResponse: any) => {
              if (tokenResponse?.error) {
                if (tokenResponse.error === 'access_denied') {
                  resolve(null);
                  return;
                }
                reject(new Error(tokenResponse.error));
                return;
              }
              if (tokenResponse?.access_token) {
                try {
                  const credential = GoogleAuthProvider.credential(null, tokenResponse.access_token);
                  const cred = await signInWithCredential(auth, credential);
                  resolve(cred.user);
                } catch (credErr) {
                  reject(credErr);
                }
              } else {
                resolve(null);
              }
            },
            error_callback: (err: any) => {
              console.warn('GIS error:', err);
              resolve(null);
            },
          });
          client.requestAccessToken({ prompt: 'select_account' });
        } catch (gisErr) {
          reject(gisErr);
        }
      });
    }

    throw err;
  }
};

/**
 * Sign in using Firebase Email & Password
 */
export const signInWithEmailPassword = async (email: string, pass: string): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return result.user;
};

/**
 * Create a new account using Firebase Email & Password
 */
export const signUpWithEmailPassword = async (
  email: string,
  pass: string,
  displayName?: string
): Promise<User> => {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName?.trim() && result.user) {
    try {
      await updateProfile(result.user, { displayName: displayName.trim() });
    } catch (e) {
      console.warn('Could not update user display name:', e);
    }
  }
  return result.user;
};

/**
 * Sign out the current user session
 */
export const signOutUser = async (): Promise<void> => {
  localStorage.removeItem('civicpulse_email_user');
  await signOut(auth);
};

// Initialize or retrieve persistent device/client UID for voting & reporting
export const ensureAuth = async (): Promise<string> => {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  // Check if an email resident citizen is signed in
  const emailUserRaw = localStorage.getItem('civicpulse_email_user');
  if (emailUserRaw) {
    try {
      const emailUser = JSON.parse(emailUserRaw);
      if (emailUser?.uid) return emailUser.uid;
    } catch (e) {
      // ignore
    }
  }
  let guestId = localStorage.getItem('civicpulse_guest_id');
  if (!guestId) {
    guestId = 'citizen_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('civicpulse_guest_id', guestId);
  }
  return guestId;
};
