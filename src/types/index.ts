// Main types export file

export * from './chrome';
export * from './database';

// Global types
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface UIState {
  selectedDatabase?: string;
  selectedStore?: string;
  sidebarCollapsed?: boolean;
  theme?: 'light' | 'dark';
}
