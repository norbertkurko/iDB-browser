// IndexedDB related types

export interface IDBDatabaseInfo {
  name: string;
  version: number;
}

export interface IDBStoreSchema {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  indexes: IDBIndexSchema[];
}

export interface IDBIndexSchema {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
}

export interface FilterOptions {
  search?: string;
  field?: string;
  operator?: 'equals' | 'contains' | 'startsWith' | 'greaterThan' | 'lessThan';
  value?: any;
  limit?: number;
  offset?: number;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}