/**
 * Модели данных для ERD после парсинга SQL DDL.
 * Соответствуют компактному формату sql-ddl-to-json-schema.
 */

export interface ColumnType {
  datatype: string
  length?: number
  displayWidth?: number
  fractional?: number
}

export interface ColumnOptions {
  nullable?: boolean
  autoincrement?: boolean
  default?: string
}

export interface ColumnRef {
  column: string
  length?: number
}

export interface PrimaryKeyDef {
  columns: ColumnRef[]
}

export interface UniqueKeyDef {
  columns: ColumnRef[]
}

export interface ForeignKeyDef {
  columns: ColumnRef[]
  ref: { table: string; columns: ColumnRef[] }
  on?: { delete?: string; update?: string }
}

export interface ParsedColumn {
  name: string
  type: ColumnType
  options?: ColumnOptions
}

export interface ParsedTable {
  name: string
  columns: ParsedColumn[]
  primaryKey?: PrimaryKeyDef
  uniqueKeys?: UniqueKeyDef[]
  foreignKeys?: ForeignKeyDef[]
  options?: { comment?: string; engine?: string }
}

export type ParsedSchema = ParsedTable[]

export interface Relation {
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
  type: 'one-to-many' | 'many-to-one'
}
