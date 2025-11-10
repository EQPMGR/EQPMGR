/**
 * Database Provider Interface
 * Abstracts database operations across different backend providers
 */

export type WhereFilterOp =
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'array-contains'
  | 'array-contains-any'
  | 'in'
  | 'not-in';

export type OrderByDirection = 'asc' | 'desc';

export interface QueryConstraint {
  type: 'where' | 'orderBy' | 'limit' | 'startAfter' | 'startAt';
  field?: string;
  op?: WhereFilterOp;
  value?: any;
  direction?: OrderByDirection;
}

export interface DocumentSnapshot<T = any> {
  id: string;
  data: T | undefined;
  exists: boolean;
}

export interface QuerySnapshot<T = any> {
  docs: Array<DocumentSnapshot<T>>;
  empty: boolean;
  size: number;
}

export interface FieldValue {
  type: 'serverTimestamp' | 'increment' | 'arrayUnion' | 'arrayRemove' | 'delete';
  value?: any;
}

export interface VectorSearchOptions {
  limit: number;
  distanceMeasure?: 'COSINE' | 'EUCLIDEAN' | 'DOT_PRODUCT';
}

export interface BatchWrite {
  set<T>(collection: string, docId: string, data: T): void;
  update<T>(collection: string, docId: string, data: Partial<T>): void;
  delete(collection: string, docId: string): void;
  commit(): Promise<void>;
}

export interface Transaction {
  get<T>(collection: string, docId: string): Promise<DocumentSnapshot<T>>;
  set<T>(collection: string, docId: string, data: T): void;
  update<T>(collection: string, docId: string, data: Partial<T>): void;
  delete(collection: string, docId: string): void;
}

export type UnsubscribeFunction = () => void;

export interface IDatabase {
  /**
   * Get a single document by ID
   */
  getDoc<T = any>(collection: string, docId: string): Promise<DocumentSnapshot<T>>;

  /**
   * Get a document from a subcollection
   */
  getSubDoc<T = any>(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    subDocId: string
  ): Promise<DocumentSnapshot<T>>;

  /**
   * Get multiple documents with query constraints
   */
  getDocs<T = any>(collection: string, ...constraints: QueryConstraint[]): Promise<QuerySnapshot<T>>;

  /**
   * Get documents from a subcollection
   */
  getSubDocs<T = any>(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    ...constraints: QueryConstraint[]
  ): Promise<QuerySnapshot<T>>;

  /**
   * Set (create or overwrite) a document
   */
  setDoc<T>(collection: string, docId: string, data: T, merge?: boolean): Promise<void>;

  /**
   * Set a document in a subcollection
   */
  setSubDoc<T>(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    subDocId: string,
    data: T,
    merge?: boolean
  ): Promise<void>;

  /**
   * Update specific fields in a document
   */
  updateDoc<T>(collection: string, docId: string, data: Partial<T>): Promise<void>;

  /**
   * Update a document in a subcollection
   */
  updateSubDoc<T>(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    subDocId: string,
    data: Partial<T>
  ): Promise<void>;

  /**
   * Delete a document
   */
  deleteDoc(collection: string, docId: string): Promise<void>;

  /**
   * Delete a document from a subcollection
   */
  deleteSubDoc(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    subDocId: string
  ): Promise<void>;

  /**
   * Subscribe to real-time updates on a document
   */
  onSnapshot<T>(
    collection: string,
    docId: string,
    callback: (snapshot: DocumentSnapshot<T>) => void,
    onError?: (error: Error) => void
  ): UnsubscribeFunction;

  /**
   * Subscribe to real-time updates on a collection query
   */
  onSnapshotQuery<T>(
    collection: string,
    callback: (snapshot: QuerySnapshot<T>) => void,
    onError?: (error: Error) => void,
    ...constraints: QueryConstraint[]
  ): UnsubscribeFunction;

  /**
   * Subscribe to real-time updates on a subcollection
   */
  onSnapshotSubCollection<T>(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    callback: (snapshot: QuerySnapshot<T>) => void,
    onError?: (error: Error) => void,
    ...constraints: QueryConstraint[]
  ): UnsubscribeFunction;

  /**
   * Create a batch write operation
   */
  batch(): BatchWrite;

  /**
   * Run a transaction
   */
  runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T>;

  /**
   * Generate a unique document ID
   */
  generateId(): string;

  /**
   * Get server timestamp field value
   */
  serverTimestamp(): FieldValue;

  /**
   * Get increment field value
   */
  increment(n: number): FieldValue;

  /**
   * Get array union field value
   */
  arrayUnion(...elements: any[]): FieldValue;

  /**
   * Get array remove field value
   */
  arrayRemove(...elements: any[]): FieldValue;

  /**
   * Get delete field value
   */
  deleteField(): FieldValue;

  /**
   * Vector similarity search
   */
  findNearest<T>(
    collection: string,
    vectorField: string,
    queryVector: number[],
    options: VectorSearchOptions
  ): Promise<Array<DocumentSnapshot<T> & { distance?: number }>>;

  /**
   * Convert date to database timestamp
   */
  toTimestamp(date: Date): any;

  /**
   * Convert database timestamp to date
   */
  fromTimestamp(timestamp: any): Date | null;

  /**
   * Get the underlying database instance (for framework-specific needs)
   */
  getDbInstance(): any;
}
