import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, FileWarning } from 'lucide-react'
import { SchemaProvider, useSchemaStore } from '@/store/schemaStore'
import { UploadZone } from '@/components/UploadZone'
import { Tabs } from '@/components/Tabs'
import { ErdCanvas } from '@/components/ErdCanvas'

function AppContent() {
  const { schema, relations, fileName, error, loadFromSql, clear } = useSchemaStore()
  const [activeTab, setActiveTab] = useState<'physical' | 'logical'>('physical')

  const handleFileSelect = useCallback(
    (content: string, name: string) => {
      loadFromSql(content, name)
    },
    [loadFromSql]
  )

  const openDialog = useCallback(() => {
    return window.electronAPI?.openSqlFile() ?? Promise.resolve(null)
  }, [])

  return (
    <div className="min-h-screen flex flex-col p-4">
      <header className="flex items-center justify-between gap-4 mb-4 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Database className="w-6 h-6 text-cyan-400 flex-shrink-0" strokeWidth={1.5} />
          <h1 className="text-base font-semibold text-slate-100 truncate">MySQL ERD Creator</h1>
          {fileName && (
            <span className="text-slate-500 text-sm truncate max-w-[180px]" title={fileName}>
              {fileName}
            </span>
          )}
        </div>
        {schema.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Tabs active={activeTab} onChange={setActiveTab} />
            <button
              type="button"
              onClick={clear}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-700/50"
            >
              Новый файл
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center"
            >
              <div className="glass-panel p-8 max-w-md flex flex-col items-center gap-4">
                <FileWarning className="w-14 h-14 text-amber-400/80" strokeWidth={1.5} />
                <p className="text-slate-300 text-center">{error}</p>
                <p className="text-slate-500 text-sm text-center">
                  Нужен файл со структурой: команды <code className="text-cyan-400">CREATE TABLE</code> (и при необходимости <code className="text-cyan-400">ALTER TABLE</code> с внешними ключами). Файлы только с данными (INSERT) не подходят.
                </p>
                <button
                  type="button"
                  onClick={clear}
                  className="px-5 py-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 font-medium"
                >
                  Загрузить другой файл
                </button>
              </div>
            </motion.div>
          ) : schema.length > 0 ? (
            <motion.div
              key="erd"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 glass-panel relative min-h-[500px]"
            >
              <ErdCanvas schema={schema} relations={relations} variant={activeTab} />
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center"
            >
              <UploadZone onFileSelect={handleFileSelect} onOpenDialog={openDialog} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <SchemaProvider>
      <AppContent />
    </SchemaProvider>
  )
}
