import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { auth, db, googleProvider, testFirestoreConnection } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { Trip, Settings, Category, Sheet, BackupSnapshot, AppState } from '../types';

export type CloudSyncStatus = 'synced' | 'syncing' | 'offline' | 'local_only' | 'error';

interface FirebaseContextType {
  user: User | null;
  authLoading: boolean;
  syncStatus: CloudSyncStatus;
  lastSyncTime: number | null;
  errorMessage: string | null;
  isCloudConnected: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  syncTripToCloud: (trip: Trip) => Promise<boolean>;
  deleteTripFromCloud: (tripId: string) => Promise<boolean>;
  syncMetaToCloud: (settings: Settings, categories: Category[], sheets: Sheet[]) => Promise<boolean>;
  pullAllFromCloud: () => Promise<{ trips: Trip[]; settings?: Settings; categories?: Category[]; sheets?: Sheet[] } | null>;
  createCloudBackup: (name: string, state: AppState, trigger?: 'auto' | 'manual' | 'checkpoint', changesSummary?: string) => Promise<BackupSnapshot | null>;
  listCloudBackups: () => Promise<BackupSnapshot[]>;
  deleteCloudBackup: (backupId: string) => Promise<boolean>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{
  children: ReactNode;
  onRemoteTripsUpdated?: (remoteTrips: Trip[]) => void;
}> = ({ children, onRemoteTripsUpdated }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('local_only');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState(false);

  // 1. Connection check on startup
  useEffect(() => {
    testFirestoreConnection().then(ok => {
      setIsCloudConnected(ok);
      if (!ok) {
        setSyncStatus('offline');
      }
    });
  }, []);

  // 2. Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        setSyncStatus('synced');
      } else {
        setSyncStatus('local_only');
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Realtime trips subscription when user is authenticated
  useEffect(() => {
    if (!user) return;

    const tripsColPath = `users/${user.uid}/trips`;
    const colRef = collection(db, 'users', user.uid, 'trips');

    const unsubscribe = onSnapshot(
      colRef,
      snapshot => {
        const remoteTrips: Trip[] = [];
        snapshot.forEach(docSnap => {
          remoteTrips.push(docSnap.data() as Trip);
        });
        if (remoteTrips.length > 0 && onRemoteTripsUpdated) {
          onRemoteTripsUpdated(remoteTrips);
        }
        setSyncStatus('synced');
        setLastSyncTime(Date.now());
      },
      error => {
        console.error('Firestore snapshot error:', error);
        setSyncStatus('error');
        setErrorMessage(error.message);
        handleFirestoreError(error, OperationType.GET, tripsColPath);
      }
    );

    return () => unsubscribe();
  }, [user, onRemoteTripsUpdated]);

  const signInWithGoogle = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      setErrorMessage(null);
      await signInWithPopup(auth, googleProvider);
      setSyncStatus('synced');
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'Failed to sign in with Google');
    }
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await signOut(auth);
      setSyncStatus('local_only');
      setErrorMessage(null);
    } catch (err: any) {
      console.error('Sign-out error:', err);
      setErrorMessage(err.message);
    }
  }, []);

  const syncTripToCloud = useCallback(async (trip: Trip): Promise<boolean> => {
    if (!user) {
      // Local only when not signed in
      return true;
    }

    const docPath = `users/${user.uid}/trips/${trip.id}`;
    setSyncStatus('syncing');

    try {
      const tripWithMeta: Trip = {
        ...trip,
        ownerId: user.uid,
        updatedAt: Date.now()
      };
      await setDoc(doc(db, 'users', user.uid, 'trips', trip.id), tripWithMeta);
      setSyncStatus('synced');
      setLastSyncTime(Date.now());
      return true;
    } catch (error: any) {
      setSyncStatus('error');
      setErrorMessage(error.message || 'Failed to sync trip to cloud');
      handleFirestoreError(error, OperationType.WRITE, docPath);
      return false;
    }
  }, [user]);

  const deleteTripFromCloud = useCallback(async (tripId: string): Promise<boolean> => {
    if (!user) return true;

    const docPath = `users/${user.uid}/trips/${tripId}`;
    setSyncStatus('syncing');

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'trips', tripId));
      setSyncStatus('synced');
      setLastSyncTime(Date.now());
      return true;
    } catch (error: any) {
      setSyncStatus('error');
      setErrorMessage(error.message || 'Failed to delete trip from cloud');
      handleFirestoreError(error, OperationType.DELETE, docPath);
      return false;
    }
  }, [user]);

  const syncMetaToCloud = useCallback(async (settings: Settings, categories: Category[], sheets: Sheet[]): Promise<boolean> => {
    if (!user) return true;

    const docPath = `users/${user.uid}/meta/settings`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'meta', 'settings'), {
        userId: user.uid,
        settings,
        categories,
        sheets,
        updatedAt: Date.now()
      });
      return true;
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
      return false;
    }
  }, [user]);

  const pullAllFromCloud = useCallback(async () => {
    if (!user) return null;

    const tripsColPath = `users/${user.uid}/trips`;
    try {
      const snap = await getDocs(collection(db, 'users', user.uid, 'trips'));
      const trips: Trip[] = [];
      snap.forEach(d => trips.push(d.data() as Trip));
      return { trips };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, tripsColPath);
      return null;
    }
  }, [user]);

  const createCloudBackup = useCallback(async (
    name: string,
    state: AppState,
    trigger: 'auto' | 'manual' | 'checkpoint' = 'manual',
    changesSummary?: string
  ): Promise<BackupSnapshot | null> => {
    if (!user) return null;

    const backupId = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tripsSummary = (state.trips || []).map(t => ({
      id: t.id,
      name: t.name,
      year: t.year,
      status: t.status,
      budget: Number(t.budget) || 0,
      expenseCount: t.expenses?.length || 0,
      planItemCount: t.planItems?.length || 0,
      country: t.country
    }));

    const snapshotDoc: BackupSnapshot = {
      id: backupId,
      name: name || `Snapshot ${new Date().toLocaleDateString('en-GB')}`,
      trigger,
      timestamp: Date.now(),
      tripCount: state.trips.length,
      tripsSummary,
      changesSummary: changesSummary || `${state.trips.length} trip(s), ${state.categories.length} categories`,
      ownerId: user.uid,
      state: {
        trips: state.trips,
        categories: state.categories,
        sheets: state.sheets,
        settings: state.settings
      }
    };

    const docPath = `users/${user.uid}/backups/${backupId}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'backups', backupId), snapshotDoc);
      return snapshotDoc;
    } catch (error: any) {
      console.error('Failed to create cloud backup:', error);
      handleFirestoreError(error, OperationType.WRITE, docPath);
      return null;
    }
  }, [user]);

  const listCloudBackups = useCallback(async (): Promise<BackupSnapshot[]> => {
    if (!user) return [];

    const backupsColPath = `users/${user.uid}/backups`;
    try {
      const q = query(collection(db, 'users', user.uid, 'backups'), orderBy('timestamp', 'desc'), limit(30));
      const snap = await getDocs(q);
      const list: BackupSnapshot[] = [];
      snap.forEach(d => {
        list.push(d.data() as BackupSnapshot);
      });
      return list;
    } catch (error: any) {
      console.error('Failed to list cloud backups:', error);
      handleFirestoreError(error, OperationType.LIST, backupsColPath);
      return [];
    }
  }, [user]);

  const deleteCloudBackup = useCallback(async (backupId: string): Promise<boolean> => {
    if (!user) return false;

    const docPath = `users/${user.uid}/backups/${backupId}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'backups', backupId));
      return true;
    } catch (error: any) {
      console.error('Failed to delete cloud backup:', error);
      handleFirestoreError(error, OperationType.DELETE, docPath);
      return false;
    }
  }, [user]);

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authLoading,
        syncStatus,
        lastSyncTime,
        errorMessage,
        isCloudConnected,
        signInWithGoogle,
        signOutUser,
        syncTripToCloud,
        deleteTripFromCloud,
        syncMetaToCloud,
        pullAllFromCloud,
        createCloudBackup,
        listCloudBackups,
        deleteCloudBackup
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseContextType => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
