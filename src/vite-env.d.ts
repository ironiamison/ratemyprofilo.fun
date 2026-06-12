/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUMP_MINT?: string;
  readonly VITE_PUMP_URL?: string;
  readonly VITE_SOLANA_RPC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
