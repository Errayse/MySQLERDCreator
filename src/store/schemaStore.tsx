import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ParsedSchema, Relation } from '@/types/schema'
import { parseSqlToSchema, parseSqlFromBlocks, extractRelations, applyPrimaryKeysFromAlter } from '@/services/sqlParser'

interface SchemaState {
  schema: ParsedSchema
  relations: Relation[]
  fileName: string | null
  error: string | null
}

interface SchemaStoreValue extends SchemaState {
  loadFromSql: (sql: string, fileName?: string) => void
  loadFromBlocks: (blocks: string[], fileName?: string, primaryKeys?: Record<string, string[]>) => void
  clear: () => void
  isEmpty: boolean
}

const initialState: SchemaState = {
  schema: [],
  relations: [],
  fileName: null,
  error: null,
}

const SchemaContext = createContext<SchemaStoreValue | null>(null)

export function SchemaProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SchemaState>(initialState)

  const loadFromSql = useCallback((sql: string, fileName?: string) => {
    try {
      const schema = parseSqlToSchema(sql)
      const relations = extractRelations(schema)
      setState({
        schema,
        relations,
        fileName: fileName ?? null,
        error: schema.length === 0 ? 'В файле не найдено ни одной таблицы (нужны команды CREATE TABLE).' : null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка разбора SQL'
      setState({
        schema: [],
        relations: [],
        fileName: fileName ?? null,
        error: `Ошибка парсинга: ${message}`,
      })
    }
  }, [])

  const loadFromBlocks = useCallback((blocks: string[], fileName?: string, primaryKeys?: Record<string, string[]>) => {
    try {
      const schema = parseSqlFromBlocks(blocks)
      if (primaryKeys && Object.keys(primaryKeys).length > 0) {
        applyPrimaryKeysFromAlter(schema, primaryKeys)
      }
      const relations = extractRelations(schema)
      setState({
        schema,
        relations,
        fileName: fileName ?? null,
        error: schema.length === 0 ? 'В файле не найдено ни одной таблицы (нужны команды CREATE TABLE).' : null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка разбора SQL'
      setState({
        schema: [],
        relations: [],
        fileName: fileName ?? null,
        error: `Ошибка парсинга: ${message}`,
      })
    }
  }, [])

  const clear = useCallback(() => setState(initialState), [])

  const value = useMemo<SchemaStoreValue>(
    () => ({
      ...state,
      loadFromSql,
      loadFromBlocks,
      clear,
      isEmpty: state.schema.length === 0,
    }),
    [state, loadFromSql, loadFromBlocks, clear]
  )

  return <SchemaContext.Provider value={value}>{children}</SchemaContext.Provider>
}

export function useSchemaStore() {
  const ctx = useContext(SchemaContext)
  if (!ctx) throw new Error('useSchemaStore must be used within SchemaProvider')
  return ctx
}
