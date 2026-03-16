import { Parser } from 'sql-ddl-to-json-schema'
import type { ParsedTable, ParsedSchema, Relation } from '@/types/schema'

/**
 * Удаляет из SQL комментарии (--, #, /* *\/), чтобы парсер DDL не падал.
 */
function stripSqlComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '\n')
    .replace(/#[^\n]*/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '\n')
    .replace(/\n\s*\n/g, '\n')
    .trim()
}

/** Только DDL-команды, которые умеет парсер. Всё остальное (SET, USE, INSERT, LOCK и т.д.) отбрасываем. */
const DDL_PREFIX = /^\s*(CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|CREATE\s+INDEX|DROP\s+INDEX|RENAME\s+TABLE)\b/i

/**
 * Оставляет в SQL только DDL-выражения. Дампы часто содержат SET, USE, LOCK и т.д. — парсер на них падает.
 */
function keepOnlyDdl(sql: string): string {
  const statements = sql.split(';').map((s) => s.trim()).filter(Boolean)
  const ddl = statements.filter((s) => DDL_PREFIX.test(s))
  return ddl.length ? ddl.join(';\n') + ';' : ''
}

/**
 * Парсит SQL DDL и возвращает массив таблиц. Комментарии и не-DDL команды (SET, USE, INSERT…) удаляются до парсинга.
 */
export function parseSqlToSchema(sql: string): ParsedSchema {
  const noComments = stripSqlComments(sql)
  const ddlOnly = keepOnlyDdl(noComments)
  if (!ddlOnly) return []
  const parser = new Parser('mysql')
  parser.feed(ddlOnly)
  const compact = parser.toCompactJson(parser.results) as ParsedTable[]
  return Array.isArray(compact) ? compact : []
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
 * Подбирает таблицу по имени колонки вида *_id (например animal_id → animals, mother_id → animals).
 */
function findTargetTable(
  columnName: string,
  schema: ParsedSchema,
  currentTableName: string
): { table: string; column: string } | null {
  if (!columnName.endsWith('_id')) return null
  const base = columnName.slice(0, -3)
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
  // Роли типа mother/father часто ссылаются на основную таблицу сущностей (например animals)
  const roleNames = new Set(['mother', 'father', 'parent', 'owner', 'author', 'user', 'creator', 'assignee'])
  if (tablesWithId.length >= 1 && roleNames.has(base)) {
    return { table: tablesWithId[0].name, column: 'id' }
  }
  return null
}

/**
 * Связи по соглашению: колонка *_id → таблица с id (по имени).
 */
function inferRelations(schema: ParsedSchema): Relation[] {
  const relations: Relation[] = []
  const pkColumns = new Map<string, Set<string>>()
  schema.forEach((t) => {
    const pk = t.primaryKey?.columns?.map((c) => c.column) ?? []
    pkColumns.set(t.name, new Set(pk))
  })
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
