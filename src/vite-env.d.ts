/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL: string;
  // (adicione aqui outras variáveis que você usa)
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
