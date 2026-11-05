/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENGINE_URL?: string;
  readonly VITE_LISTEN_TOGETHER_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
