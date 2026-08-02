/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * PBKDF2 hash of the admin access key, produced by `npm run admin:key`.
   * Only the hash ships to the browser. Unset means the /admin gate is open,
   * which is the right default for local development.
   */
  readonly VITE_ADMIN_KEY_HASH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
