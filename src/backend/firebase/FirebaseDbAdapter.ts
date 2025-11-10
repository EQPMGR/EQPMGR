/**
 * Firebase Database Adapter
 * Implements IDatabase interface using Cloud Firestore
 */

import {
  Firestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  startAt,
  onSnapshot,
  writeBatch,
  runTransaction,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  deleteField,
  Timestamp,
  type DocumentSnapshot as FirestoreDocumentSnapshot,
  type QuerySnapshot as FirestoreQuerySnapshot,
  type QueryConstraint as FirestoreQueryConstraint,
  type WhereFilterOp as FirestoreWhereFilterOp,
  type OrderByDirection as FirestoreOrderByDirection,
} from 'firebase/firestore';
import admin from 'firebase-admin';
import { getFirebaseServices } from '@/lib/firebase';
import { getAdminDb } from '@/lib/firebase-admin';
import type {
  IDatabase,
  QueryConstraint,
  DocumentSnapshot,
  QuerySnapshot,
  FieldValue,
  VectorSearchOptions,
  BatchWrite,
  Transaction,
  UnsubscribeFunction,
} from '../interfaces';

export class FirebaseDbAdapter implements IDatabase {
  private db: Firestore | admin.firestore.Firestore | null = null;
  private isServer: boolean;
  private isAdmin: boolean = false;

  constructor(isServer: boolean = false) {
    this.isServer = isServer;

    if (isServer) {
      // Server-side: use admin SDK
      this.db = getAdminDb();
      this.isAdmin = true;
    } else {
      // Client-side: lazy initialization
    }
  }

  /**
   * Ensure Firestore client SDK is initialized
   */
  private async ensureDb(): Promise<Firestore> {
    if (!this.db || this.isAdmin) {
      const services = await getFirebaseServices();
      this.db = services.db;
      this.isAdmin = false;
    }
    return this.db as Firestore;
  }

  /**
   * Get current database instance (client or admin)
   */
  private getDb(): Firestore | admin.firestore.Firestore {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Convert Date objects to Firestore Timestamps recursively
   */
  private convertDatesToTimestamps(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (data instanceof Date) {
      return Timestamp.fromDate(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.convertDatesToTimestamps(item));
    }

    const converted: any = {};
    for (const [key, value] of Object.entries(data)) {
      converted[key] = this.convertDatesToTimestamps(value);
    }
    return converted;
  }

  /**
   * Convert Firestore Timestamps to Date objects recursively
   */
  private convertTimestampsToDates(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (data instanceof Timestamp || (data.toDate && typeof data.toDate === 'function')) {
      return this.fromTimestamp(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.convertTimestampsToDates(item));
    }

    const converted: any = {};
    for (const [key, value] of Object.entries(data)) {
      converted[key] = this.convertTimestampsToDates(value);
    }
    return converted;
  }

  /**
   * Convert our QueryConstraint to Firestore QueryConstraint
   */
  private convertQueryConstraint(constraint: QueryConstraint): FirestoreQueryConstraint | null {
    switch (constraint.type) {
      case 'where':
        if (!constraint.field || !constraint.op) return null;
        return where(constraint.field, constraint.op as FirestoreWhereFilterOp, constraint.value);
      case 'orderBy':
        if (!constraint.field) return null;
        return orderBy(constraint.field, constraint.direction as FirestoreOrderByDirection);
      case 'limit':
        if (typeof constraint.value !== 'number') return null;
        return limit(constraint.value);
      case 'startAfter':
        return startAfter(constraint.value);
      case 'startAt':
        return startAt(constraint.value);
      default:
        return null;
    }
  }

  /**
   * Convert Firestore DocumentSnapshot to our DocumentSnapshot
   */
  private convertDocSnapshot<T>(snapshot: FirestoreDocumentSnapshot | admin.firestore.DocumentSnapshot): DocumentSnapshot<T> {
    const rawData = snapshot.exists() ? snapshot.data() : undefined;
    const convertedData = rawData ? this.convertTimestampsToDates(rawData) as T : undefined;

    return {
      id: snapshot.id,
      data: convertedData,
      exists: snapshot.exists(),
    };
  }

  /**
   * Convert Firestore QuerySnapshot to our QuerySnapshot
   */
  private convertQuerySnapshot<T>(snapshot: FirestoreQuerySnapshot | admin.firestore.QuerySnapshot): QuerySnapshot<T> {
    return {
      docs: snapshot.docs.map((doc) => this.convertDocSnapshot<T>(doc as any)),
      empty: snapshot.empty,
      size: snapshot.size,
    };
  }

  async getDoc<T = any>(collection: string, docId: string): Promise<DocumentSnapshot<T>> {
    const db = this.isAdmin ? this.getDb() : await this.ensureDb();
    const docRef = doc(db as Firestore, collection, docId);
    const snapshot = await getDoc(docRef);
    return this.convertDocSnapshot<T>(snapshot);
  }

  async getSubDoc<T = any>(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    subDocId: string
  ): Promise<DocumentSnapshot<T>> {
    const db = this.isAdmin ? this.getDb() : await this.ensureDb();
    const docRef = doc(db as Firestore, parentCollection, parentDocId, subCollection, subDocId);
    const snapshot = await getDoc(docRef);
    return this.convertDocSnapshot<T>(snapshot);
  }

  async getDocs<T = any>(collectionPath: string, ...constraints: QueryConstraint[]): Promise<QuerySnapshot<T>> {
    const db = this.isAdmin ? this.getDb() : await this.ensureDb();
    const collectionRef = collection(db as Firestore, collectionPath);

    if (constraints.length === 0) {
      const snapshot = await getDocs(collectionRef);
      return this.convertQuerySnapshot<T>(snapshot);
    }

    const firestoreConstraints = constraints
      .map((c) => this.convertQueryConstraint(c))
      .filter((c) => c !== null) as FirestoreQueryConstraint[];

    const q = query(collectionRef, ...firestoreConstraints);
    const snapshot = await getDocs(q);
    return this.convertQuerySnapshot<T>(snapshot);
  }

  async getSubDocs<T = any>(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    ...constraints: QueryConstraint[]
  ): Promise<QuerySnapshot<T>> {
    const db = this.isAdmin ? this.getDb() : await this.ensureDb();
    const subCollectionRef = collection(db as Firestore, parentCollection, parentDocId, subCollection);

    if (constraints.length === 0) {
      const snapshot = await getDocs(subCollectionRef);
      return this.convertQuerySnapshot<T>(snapshot);
    }

    const firestoreConstraints = constraints
      .map((c) => this.convertQueryConstraint(c))
      .filter((c) => c !== null) as FirestoreQueryConstraint[];

    const q = query(subCollectionRef, ...firestoreConstraints);
    const snapshot = await getDocs(q);
    return this.convertQuerySnapshot<T>(snapshot);
  }

  async setDoc<T>(collectionPath: string, docId: string, data: T, merge?: boolean): Promise<void> {
    const db = this.isAdmin ? this.getDb() : await this.ensureDb();
    const docRef = doc(db as Firestore, collectionPath, docId);
    // Convert Date objects to Firestore Timestamps
    const convertedData = this.convertDatesToTimestamps(data);
    await setDoc(docRef, convertedData as any, merge ? { merge: true } : {});
  }

  async setSubDoc<T>(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    subDocId: string,
    data: T,
    merge?: boolean
  ): Promise<void> {
    const db = this.isAdmin ? this.getDb() : await this.ensureDb();
    const docRef = doc(db as Firestore, parentCollection, parentDocId, subCollection, subDocId);
    const convertedData = this.convertDatesToTimestamps(data);
    await setDoc(docRef, convertedData as any, merge ? { merge: true } : {});
  }

  async updateDoc<T>(collectionPath: string, docId: string, data: Partial<T>): Promise<void> {
    const db = this.isAdmin ? this.getDb() : await this.ensureDb();
    const docRef = doc(db as Firestore, collectionPath, docId);
    const convertedData = this.convertDatesToTimestamps(data);
    await updateDoc(docRef, convertedData as any);
  }

  async updateSubDoc<T>(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    subDocId: string,
    data: Partial<T>
  ): Promise<void> {
    const db = this.isAdmin ? this.getDb() : await this.ensureDb();
    const docRef = doc(db as Firestore, parentCollection, parentDocId, subCollection, subDocId);
    const convertedData = this.convertDatesToTimestamps(data);
    await updateDoc(docRef, convertedData as any);
  }

  async deleteDoc(collectionPath: string, docId: string): Promise<void> {
    const db = this.isAdmin ? this.getDb() : await this.ensureDb();
    const docRef = doc(db as Firestore, collectionPath, docId);
    await deleteDoc(docRef);
  }

  async deleteSubDoc(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    subDocId: string
  ): Promise<void> {
    const db = this.isAdmin ? this.getDb() : await this.ensureDb();
    const docRef = doc(db as Firestore, parentCollection, parentDocId, subCollection, subDocId);
    await deleteDoc(docRef);
  }

  onSnapshot<T>(
    collectionPath: string,
    docId: string,
    callback: (snapshot: DocumentSnapshot<T>) => void,
    onError?: (error: Error) => void
  ): UnsubscribeFunction {
    if (this.isAdmin) {
      throw new Error('Real-time listeners not supported in admin/server context');
    }

    let unsubscribe: UnsubscribeFunction | null = null;

    this.ensureDb().then((db) => {
      const docRef = doc(db, collectionPath, docId);
      unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          callback(this.convertDocSnapshot<T>(snapshot));
        },
        onError
      );
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }

  onSnapshotQuery<T>(
    collectionPath: string,
    callback: (snapshot: QuerySnapshot<T>) => void,
    onError?: (error: Error) => void,
    ...constraints: QueryConstraint[]
  ): UnsubscribeFunction {
    if (this.isAdmin) {
      throw new Error('Real-time listeners not supported in admin/server context');
    }

    let unsubscribe: UnsubscribeFunction | null = null;

    this.ensureDb().then((db) => {
      const collectionRef = collection(db, collectionPath);

      if (constraints.length === 0) {
        unsubscribe = onSnapshot(
          collectionRef,
          (snapshot) => {
            callback(this.convertQuerySnapshot<T>(snapshot));
          },
          onError
        );
      } else {
        const firestoreConstraints = constraints
          .map((c) => this.convertQueryConstraint(c))
          .filter((c) => c !== null) as FirestoreQueryConstraint[];

        const q = query(collectionRef, ...firestoreConstraints);
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            callback(this.convertQuerySnapshot<T>(snapshot));
          },
          onError
        );
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }

  onSnapshotSubCollection<T>(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    callback: (snapshot: QuerySnapshot<T>) => void,
    onError?: (error: Error) => void,
    ...constraints: QueryConstraint[]
  ): UnsubscribeFunction {
    if (this.isAdmin) {
      throw new Error('Real-time listeners not supported in admin/server context');
    }

    let unsubscribe: UnsubscribeFunction | null = null;

    this.ensureDb().then((db) => {
      const subCollectionRef = collection(db, parentCollection, parentDocId, subCollection);

      if (constraints.length === 0) {
        unsubscribe = onSnapshot(
          subCollectionRef,
          (snapshot) => {
            callback(this.convertQuerySnapshot<T>(snapshot));
          },
          onError
        );
      } else {
        const firestoreConstraints = constraints
          .map((c) => this.convertQueryConstraint(c))
          .filter((c) => c !== null) as FirestoreQueryConstraint[];

        const q = query(subCollectionRef, ...firestoreConstraints);
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            callback(this.convertQuerySnapshot<T>(snapshot));
          },
          onError
        );
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }

  batch(): BatchWrite {
    const db = this.isAdmin ? this.getDb() : this.db;
    if (!db) {
      throw new Error('Database not initialized for batch operation');
    }

    const firestoreBatch = writeBatch(db as Firestore);

    return {
      set: <T>(collectionPath: string, docId: string, data: T) => {
        const docRef = doc(db as Firestore, collectionPath, docId);
        firestoreBatch.set(docRef, data as any);
      },
      update: <T>(collectionPath: string, docId: string, data: Partial<T>) => {
        const docRef = doc(db as Firestore, collectionPath, docId);
        firestoreBatch.update(docRef, data as any);
      },
      delete: (collectionPath: string, docId: string) => {
        const docRef = doc(db as Firestore, collectionPath, docId);
        firestoreBatch.delete(docRef);
      },
      commit: () => firestoreBatch.commit(),
    };
  }

  async runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> {
    const db = this.isAdmin ? this.getDb() : await this.ensureDb();

    return await runTransaction(db as Firestore, async (firestoreTransaction) => {
      const transactionWrapper: Transaction = {
        get: async <TData>(collectionPath: string, docId: string) => {
          const docRef = doc(db as Firestore, collectionPath, docId);
          const snapshot = await firestoreTransaction.get(docRef);
          return this.convertDocSnapshot<TData>(snapshot);
        },
        set: <TData>(collectionPath: string, docId: string, data: TData) => {
          const docRef = doc(db as Firestore, collectionPath, docId);
          firestoreTransaction.set(docRef, data as any);
        },
        update: <TData>(collectionPath: string, docId: string, data: Partial<TData>) => {
          const docRef = doc(db as Firestore, collectionPath, docId);
          firestoreTransaction.update(docRef, data as any);
        },
        delete: (collectionPath: string, docId: string) => {
          const docRef = doc(db as Firestore, collectionPath, docId);
          firestoreTransaction.delete(docRef);
        },
      };

      return await updateFunction(transactionWrapper);
    });
  }

  generateId(): string {
    const db = this.isAdmin ? this.getDb() : this.db;
    if (!db) {
      throw new Error('Database not initialized');
    }
    const collectionRef = collection(db as Firestore, 'temp');
    return doc(collectionRef).id;
  }

  serverTimestamp(): FieldValue {
    return { type: 'serverTimestamp' } as FieldValue;
  }

  increment(n: number): FieldValue {
    return { type: 'increment', value: n } as FieldValue;
  }

  arrayUnion(...elements: any[]): FieldValue {
    return { type: 'arrayUnion', value: elements } as FieldValue;
  }

  arrayRemove(...elements: any[]): FieldValue {
    return { type: 'arrayRemove', value: elements } as FieldValue;
  }

  deleteField(): FieldValue {
    return { type: 'delete' } as FieldValue;
  }

  async findNearest<T>(
    collectionPath: string,
    vectorField: string,
    queryVector: number[],
    options: VectorSearchOptions
  ): Promise<Array<DocumentSnapshot<T> & { distance?: number }>> {
    // Firebase/Firestore vector search implementation
    // Note: This requires the findNearest query which is available in Firebase
    const db = this.isAdmin ? this.getDb() : await this.ensureDb();

    // Import the findNearest method from Firestore
    const { findNearest } = await import('firebase/firestore');

    const collectionRef = collection(db as Firestore, collectionPath);
    const vectorQuery = query(
      collectionRef,
      findNearest(vectorField, queryVector, {
        limit: options.limit,
        distanceMeasure: options.distanceMeasure || 'COSINE',
      })
    );

    const snapshot = await getDocs(vectorQuery);
    return snapshot.docs.map((doc) => ({
      ...this.convertDocSnapshot<T>(doc),
      distance: (doc as any).distance,
    }));
  }

  toTimestamp(date: Date): Timestamp {
    return Timestamp.fromDate(date);
  }

  fromTimestamp(timestamp: any): Date | null {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000);
    }
    return null;
  }

  getDbInstance(): Firestore | admin.firestore.Firestore | null {
    return this.db;
  }
}

/**
 * Helper function to convert FieldValue objects to actual Firestore FieldValues
 * This is used when passing data to Firestore that contains FieldValue markers
 */
export function convertFieldValues(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(convertFieldValues);
  }

  const converted: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'type' in value) {
      const fieldValue = value as FieldValue;
      switch (fieldValue.type) {
        case 'serverTimestamp':
          converted[key] = serverTimestamp();
          break;
        case 'increment':
          converted[key] = increment(fieldValue.value);
          break;
        case 'arrayUnion':
          converted[key] = arrayUnion(...fieldValue.value);
          break;
        case 'arrayRemove':
          converted[key] = arrayRemove(...fieldValue.value);
          break;
        case 'delete':
          converted[key] = deleteField();
          break;
        default:
          converted[key] = value;
      }
    } else {
      converted[key] = convertFieldValues(value);
    }
  }
  return converted;
}
