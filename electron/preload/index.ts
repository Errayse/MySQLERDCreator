import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openSqlFile: () => ipcRenderer.invoke('dialog:openSqlFile') as Promise<{ filePath: string; blocks: string[]; primaryKeys: Record<string, string[]> } | null>,
})

function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise<void>((resolve) => {
    if (condition.includes(document.readyState)) resolve()
    else document.addEventListener('readystatechange', () => {
      if (condition.includes(document.readyState)) resolve()
    })
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).includes(child)) parent.appendChild(child)
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).includes(child)) parent.removeChild(child)
  },
}

function useLoading() {
  const className = 'loaders-css__square-spin'
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: rgba(34, 211, 238, 0.3);
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  z-index: 9;
}`
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')
  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = '<div></div>'
  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)
window.onmessage = (ev) => {
  if (ev.data?.payload === 'removeLoading') removeLoading()
}
setTimeout(removeLoading, 3000)
