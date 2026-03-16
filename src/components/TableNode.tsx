import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { ParsedTable, ParsedColumn } from '@/types/schema'
import { formatColumnType } from '@/services/sqlParser'

export interface TableNodeData extends Record<string, unknown> {
  table: ParsedTable
  isPhysical?: boolean
  fkMap?: Record<string, { table: string; column: string }>
}

type TableNodeProps = NodeProps<Node<TableNodeData, 'table'>>

function TableNodeComponent({ data, selected }: TableNodeProps) {
  const { table, isPhysical = true, fkMap = {} } = data
  const pkColumns = new Set((table.primaryKey?.columns ?? []).map((c: { column: string }) => c.column))

  return (
    <div
      className={`
        glass-panel w-[240px] overflow-hidden
        transition-all duration-200
        ${selected ? 'ring-2 ring-cyan-400/60 shadow-glow' : ''}
      `}
    >
      <div className="px-3 py-2.5 border-b border-slate-700/50 bg-slate-800/40">
        <div className="font-semibold text-cyan-400 truncate text-sm" title={table.name}>
          {table.name}
        </div>
        {table.options?.comment && (
          <div className="text-[11px] text-slate-500 mt-0.5 truncate" title={table.options.comment}>
            {table.options.comment}
          </div>
        )}
      </div>
      <div className="max-h-[240px] overflow-y-auto">
        {table.columns.map((col: ParsedColumn) => {
          const isPk = pkColumns.has(col.name)
          const fk = fkMap[col.name]
          return (
            <div
              key={col.name}
              className="flex flex-col gap-0.5 px-3 py-1.5 text-xs border-b border-slate-800/50 last:border-0"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-medium ${isPk ? 'text-amber-400' : 'text-slate-300'}`}>
                  {col.name}
                </span>
                {isPk && <span className="text-amber-400/80" title="Primary key">PK</span>}
                {fk && (
                  <span className="text-violet-400/90 truncate" title={`→ ${fk.table}.${fk.column}`}>
                    → {fk.table}
                  </span>
                )}
              </div>
              {isPhysical && (
                <span className="text-slate-500 text-[11px] truncate" title={formatColumnType(col)}>
                  {formatColumnType(col)}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !border-2 !border-cyan-400 !bg-slate-900" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !border-2 !border-cyan-400 !bg-slate-900" />
    </div>
  )
}

export const TableNode = memo(TableNodeComponent)
