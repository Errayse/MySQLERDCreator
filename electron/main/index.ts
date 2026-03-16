import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { extractCreateTableBlocks, getPrimaryKeysFromAlter } from '../../src/services/sqlExtract'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'MySQL ERD Creator',
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  win.once('ready-to-show', () => win?.show())

  if (VITE_DEV_SERVER_URL) {
    await win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    await win.loadFile(indexHtml)
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
}

ipcMain.handle('dialog:openSqlFile', async () => {
  const result = await dialog.showOpenDialog(win!, {
    title: 'Выберите SQL файл',
    filters: [{ name: 'SQL', extensions: ['sql'] }, { name: 'All', extensions: ['*'] }],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  const content = await readFile(filePath, 'utf-8')
  const blocks = extractCreateTableBlocks(content)
  const primaryKeys = getPrimaryKeysFromAlter(content)
  return { filePath, blocks, primaryKeys }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
  else BrowserWindow.getAllWindows()[0].focus()
})
