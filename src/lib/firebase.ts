import { initializeApp, FirebaseError } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof FirebaseError) {
      const code = error.code;

      if (
        code === 'permission-denied' ||
        code === 'failed-precondition' ||
        code === 'unavailable' ||
        code === 'auth/invalid-user-token' ||
        code === 'auth/user-token-expired'
      ) {
        console.warn('Firestore connection check reached the server but access is restricted:', code);
        return false;
      }
    }

    if (error instanceof Error && error.message.includes('offline')) {
      console.warn('Firestore offline:', error.message);
      return false;
    }

    console.warn('Firestore connection check failed:', error);
    return false;
  }
}
