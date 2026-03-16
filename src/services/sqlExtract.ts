/**
 * Извлечение блоков CREATE TABLE из SQL без зависимости от парсера.
 * Используется в main-процессе Electron, чтобы передавать только DDL-блоки по IPC (без лимита на размер файла).
 */
const CREATE_TABLE_RE = /\bCREATE\s+TABLE\b/gi

function scanPastMatchingParenAndSemicolon(sql: string, startIndex: number): number {
  let depth = 0
  let inString: "'" | '"' | '`' | null = null
  let i = startIndex
  while (i < sql.length) {
    const c = sql[i]
    if (inString) {
      if (c === '\\' && i + 1 < sql.length) {
        i += 2
        continue
      }
      if (inString === "'" && c === "'" && sql[i + 1] === "'") {
        i += 2
        continue
      }
      if (c === inString) {
        inString = null
      }
      i++
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      inString = c
      i++
      continue
    }
    if (c === '(') {
      depth++
      i++
      continue
    }
    if (c === ')') {
      depth--
      i++
      continue
    }
    if (c === ';' && depth === 0) {
      return i + 1
    }
    i++
  }
  return i
}

export function extractCreateTableBlocks(sql: string): string[] {
  const blocks: string[] = []
  CREATE_TABLE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = CREATE_TABLE_RE.exec(sql)) !== null) {
    const start = m.index
    const end = scanPastMatchingParenAndSemicolon(sql, start)
    const block = sql.slice(start, end).trim()
    if (block.length > 10) blocks.push(block)
  }
  return blocks
}

const ALTER_PRIMARY_RE = /ALTER\s+TABLE\s+[`"]?(\w+)[`"]?\s+ADD\s+PRIMARY\s+KEY\s*\(([^)]+)\)/gi

/**
 * Извлекает из SQL определения PRIMARY KEY из ALTER TABLE (дампы часто задают PK так).
 * Возвращает: имя_таблицы → массив имён колонок PK.
 */
export function getPrimaryKeysFromAlter(sql: string): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  ALTER_PRIMARY_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = ALTER_PRIMARY_RE.exec(sql)) !== null) {
    const tableName = m[1]
    const colList = m[2].split(',').map((s) => s.replace(/`/g, '').trim()).filter(Boolean)
    if (colList.length > 0) out[tableName] = colList
  }
  return out
}
