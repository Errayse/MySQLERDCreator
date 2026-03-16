import { Parser } from 'sql-ddl-to-json-schema'
import type { ParsedTable, ParsedSchema, Relation } from '@/types/schema'

/**
 * Удаляет только целые строки-комментарии (строка начинается с -- или #).
 * Не трогает содержимое строк, чтобы не портить значения вроде '--' в INSERT.
 */
function stripLineCommentsOnly(sql: string): string {
  return sql
    .replace(/^\s*(--[^\n]*|#[^\n]*)\n?/gm, '\n')
    .replace(/^\s*\n/gm, '')
    .trim()
}

const CREATE_TABLE_RE = /\bCREATE\s+TABLE\b/gi

/**
 * Сканирует строку в одном проходе: скобки и кавычки учитываются.
 */
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

/**
 * Извлекает из SQL все блоки CREATE TABLE целиком: ищем "CREATE TABLE", затем
 * идём до ";" на верхнем уровне (учитывая скобки и строки). Так не теряются колонки
 * даже при большом файле или особенностях разбиения по ";".
 */
function extractCreateTableBlocks(sql: string): string[] {
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

/**
 * Упрощает конструкции MySQL, которые парсер может не принять.
 */
function simplifyDdlForParser(ddl: string): string {
  return ddl
    .replace(/\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, '')
    .replace(/\s+DEFAULT\s+CURRENT_TIMESTAMP\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, ' DEFAULT CURRENT_TIMESTAMP')
}

/** Fallback: вытаскивает колонки из CREATE TABLE по шаблону `name` type(...). Если парсер в браузере обрезает колонки — покажем все по regex. */
function fallbackParseCreateTable(block: string): ParsedTable | null {
  const nameMatch = block.match(/\bCREATE\s+TABLE\s+[`"]?([^`"\s(]+)[`"]?\s*\(/i)
  if (!nameMatch) return null
  const tableName = nameMatch[1]
  const openParen = block.indexOf('(')
  if (openParen === -1) return null
  const closeParen = block.lastIndexOf(')')
  if (closeParen <= openParen) return null
  const body = block.slice(openParen + 1, closeParen)
  const columns: ParsedTable['columns'] = []
  const colRegex = /`([^`]+)`\s+(\w+)(?:\([^)]*\))?/g
  let m: RegExpExecArray | null
  while ((m = colRegex.exec(body)) !== null) {
    columns.push({
      name: m[1],
      type: { datatype: (m[2] || 'varchar').toLowerCase() },
      options: {},
    })
  }
  if (columns.length === 0) return null
  return { name: tableName, columns }
}

function parseBlocksToSchema(blocks: string[]): ParsedTable[] {
  const allTables: ParsedTable[] = []
  for (const rawBlock of blocks) {
    const block = stripLineCommentsOnly(simplifyDdlForParser(rawBlock))
    if (!block || !block.toUpperCase().startsWith('CREATE TABLE')) continue

    let table: ParsedTable | null = null
    try {
      const parser = new Parser('mysql')
      parser.feed(block.endsWith(';') ? block : block + ';')
      const compact = parser.toCompactJson(parser.results) as ParsedTable[]
      if (Array.isArray(compact) && compact[0]?.name && Array.isArray(compact[0].columns)) {
        table = compact[0]
      }
    } catch {
      // парсер упал
    }

    const fallback = fallbackParseCreateTable(block)
    if (fallback && (fallback.columns.length > (table?.columns?.length ?? 0))) {
      table = fallback
    }
    if (table?.name && Array.isArray(table.columns) && table.columns.length > 0) {
      allTables.push(table)
    }
  }
  return allTables
}

/**
 * Парсит уже извлечённые блоки CREATE TABLE (например, переданные из main-процесса).
 */
export function parseSqlFromBlocks(blocks: string[]): ParsedSchema {
  if (blocks.length === 0) return []
  return parseBlocksToSchema(blocks)
}

/**
 * Подставляет PRIMARY KEY из ALTER TABLE в схему (дампы часто задают PK так).
 */
export function applyPrimaryKeysFromAlter(
  schema: ParsedSchema,
  primaryKeys: Record<string, string[]>
): void {
  for (const table of schema) {
    const cols = primaryKeys[table.name]
    if (cols?.length) {
      table.primaryKey = { columns: cols.map((column) => ({ column })) }
    }
  }
}

/**
 * Парсит SQL DDL и возвращает массив таблиц.
 * CREATE TABLE извлекаются по блоку; если библиотечный парсер вернул мало колонок — используется fallback по regex.
 */
export function parseSqlToSchema(sql: string): ParsedSchema {
  const blocks = extractCreateTableBlocks(sql)
  if (blocks.length === 0) return []
  return parseBlocksToSchema(blocks)
}

/**
 * Связи из явных FOREIGN KEY в DDL.
 */
function getExplicitRelations(schema: ParsedSchema): Relation[] {
  const relations: Relation[] = []
  for (const table of schema) {
    for (const fk of table.foreignKeys ?? []) {
      const srcCol = fk.columns[0]?.column
      const ref = fk.ref
      if (!srcCol || !ref?.table || !ref.columns?.[0]) continue
      relations.push({
        sourceTable: table.name,
        sourceColumn: srcCol,
        targetTable: ref.table,
        targetColumn: ref.columns[0].column,
        type: 'many-to-one',
      })
    }
  }
  return relations
}

/**
 * Из имени колонки-ссылки вытаскивает "базу" для поиска таблицы: animal_id → animal, dietId → diet.
 */
function fkColumnToBase(columnName: string): string | null {
  if (columnName.endsWith('_id')) return columnName.slice(0, -3) || null
  if (columnName.length > 2 && columnName.endsWith('Id') && columnName[columnName.length - 3] !== '_') {
    return columnName.slice(0, -2)
  }
  return null
}

/**
 * Подбирает таблицу по имени колонки: *_id или *Id (animal_id → animals, dietId → diets).
 */
function findTargetTable(
  columnName: string,
  schema: ParsedSchema,
  currentTableName: string
): { table: string; column: string } | null {
  const base = fkColumnToBase(columnName)
  if (!base) return null
  const tablesWithId = schema.filter((t) => t.name !== currentTableName && t.columns.some((c) => c.name === 'id'))
  const byName = tablesWithId.find(
    (t) =>
      t.name === base ||
      t.name === base + 's' ||
      t.name === base + 'es' ||
      base === t.name.replace(/s$/, '') ||
      base === t.name.replace(/es$/, '')
  )
  if (byName) return { table: byName.name, column: 'id' }
  const roleNames = new Set(['mother', 'father', 'parent', 'owner', 'author', 'user', 'creator', 'assignee'])
  if (tablesWithId.length >= 1 && roleNames.has(base)) {
    return { table: tablesWithId[0].name, column: 'id' }
  }
  return null
}

/** Как в TableNode: если PRIMARY KEY не распарсен (ALTER TABLE), считаем id PK. */
function getPkColumns(schema: ParsedSchema): Map<string, Set<string>> {
  const pkColumns = new Map<string, Set<string>>()
  schema.forEach((t) => {
    const explicit = t.primaryKey?.columns?.map((c) => c.column) ?? []
    const pk =
      explicit.length > 0 ? explicit : t.columns.some((c) => c.name === 'id') ? ['id'] : []
    pkColumns.set(t.name, new Set(pk))
  })
  return pkColumns
}

/**
 * Связи по соглашению: колонка *_id / *Id → таблица с id (по имени).
 */
function inferRelations(schema: ParsedSchema): Relation[] {
  const relations: Relation[] = []
  const pkColumns = getPkColumns(schema)
  for (const table of schema) {
    const pks = pkColumns.get(table.name) ?? new Set()
    for (const col of table.columns) {
      if (pks.has(col.name)) continue
      const target = findTargetTable(col.name, schema, table.name)
      if (target) {
        relations.push({
          sourceTable: table.name,
          sourceColumn: col.name,
          targetTable: target.table,
          targetColumn: target.column,
          type: 'many-to-one',
        })
      }
    }
  }
  return relations
}

/**
 * Все связи: явные FK из DDL + выведенные по колонкам *_id.
 */
export function extractRelations(schema: ParsedSchema): Relation[] {
  const explicit = getExplicitRelations(schema)
  const byKey = new Set(explicit.map((r) => `${r.sourceTable}.${r.sourceColumn}`))
  const inferred = inferRelations(schema).filter((r) => !byKey.has(`${r.sourceTable}.${r.sourceColumn}`))
  return [...explicit, ...inferred]
}

/**
 * Форматирует тип колонки для отображения (например INT(11) -> INT, VARCHAR(255) -> VARCHAR(255)).
 */
export function formatColumnType(col: ParsedTable['columns'][0]): string {
  const t = col.type
  if (!t) return '?'
  let out = (t.datatype ?? '').toUpperCase()
  if (t.length != null) out += `(${t.length})`
  else if (t.displayWidth != null) out += `(${t.displayWidth})`
  if (col.options?.nullable === false) out += ' NOT NULL'
  if (col.options?.autoincrement) out += ' AUTO_INCREMENT'
  return out
}
