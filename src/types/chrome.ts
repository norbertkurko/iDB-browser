declare global {
  interface Window {
    chrome: typeof chrome;
  }
}

// Custom Chrome extension types
export interface ChromeMessage {
  action: string;
  data?: any;
  target?: 'background' | 'content' | 'popup' | 'panel';
}

export interface ChromeResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Database related types
export interface DatabaseInfo {
  name: string;
  version: number;
  stores?: string[];
  storeCount?: number;
}

export interface StoreInfo {
  name: string;
  keyPath: string | string[];
  autoIncrement: boolean;
  indexes: IndexInfo[];
}

export interface IndexInfo {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
}

export interface TableDataResponse {
  data: any[];
  totalCount: number;
  filteredCount?: number;
}