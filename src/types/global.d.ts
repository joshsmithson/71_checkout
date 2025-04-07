// Global type declarations

interface Window {
  debugLog?: (message: string) => void;
  DEBUG_MODE?: boolean;
  __ENV?: Record<string, string>;
}

// Make TypeScript aware of Vite's import.meta.env
interface ImportMeta {
  env: {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    VITE_APP_DEBUG?: string;
    VITE_APP_VERSION?: string;
    VITE_APP_BUILD_TIME?: string;
    MODE: string;
    PROD: boolean;
    DEV: boolean;
    [key: string]: string | undefined | boolean;
  };
} 