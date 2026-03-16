import { useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { FileCode, Upload } from 'lucide-react'

interface UploadZoneProps {
  onFileSelect: (content: string, fileName: string) => void
  onDialogResult?: (result: { filePath: string; blocks: string[]; primaryKeys: Record<string, string[]> }) => void
  onOpenDialog?: () => Promise<{ filePath: string; blocks: string[]; primaryKeys: Record<string, string[]> } | null>
}

export function UploadZone({ onFileSelect, onDialogResult, onOpenDialog }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (!file?.name.endsWith('.sql')) return
      const reader = new FileReader()
      reader.onload = () => {
        onFileSelect(reader.result as string, file.name)
      }
      reader.readAsText(file)
    },
    [onFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        onFileSelect(reader.result as string, file.name)
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [onFileSelect]
  )

  const handleUploadClick = useCallback(async () => {
    if (onOpenDialog && onDialogResult && typeof window !== 'undefined' && window.electronAPI?.openSqlFile) {
      const result = await onOpenDialog()
      if (result) onDialogResult(result)
    } else {
      fileInputRef.current?.click()
    }
  }, [onOpenDialog, onDialogResult, onFileSelect])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-12 text-center"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-2xl bg-slate-800/60 p-6 border border-slate-700/50">
          <FileCode className="w-16 h-16 text-cyan-400/80 mx-auto" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-slate-300 text-lg font-medium">Перетащите SQL сюда или нажмите кнопку</p>
          <p className="text-slate-600 text-xs mt-2">Нужна структура БД: <span className="text-cyan-400/80">CREATE TABLE</span> (и при необходимости ALTER TABLE)</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".sql"
          className="hidden"
          onChange={handleInputChange}
        />
        <button
          type="button"
          onClick={handleUploadClick}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500/25 hover:bg-cyan-500/35 text-cyan-400 font-medium transition-colors border border-cyan-500/40"
        >
          <Upload className="w-5 h-5" />
          Загрузить SQL
        </button>
      </div>
    </motion.div>
  )
}
