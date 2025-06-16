// Vite environment types

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_VERSION: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Chrome extension globals
declare const chrome: typeof import('chrome');
declare const browser: typeof import('webextension-polyfill');

// Global constants from build
declare const __DEV__: boolean;
declare const __VERSION__: string;