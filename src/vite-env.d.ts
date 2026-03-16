/// <reference types="vite/client" />

interface ElectronAPI {
  openSqlFile: () => Promise<{ filePath: string; blocks: string[]; primaryKeys: Record<string, string[]> } | null>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
