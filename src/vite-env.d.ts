/// <reference types="vite/client" />

interface ElectronAPI {
  openSqlFile: () => Promise<{ filePath: string; content: string } | null>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
