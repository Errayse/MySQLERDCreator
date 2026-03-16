import { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Connection,
  type NodeTypes,
  BackgroundVariant,
} from '@xyflow/react'
import { toJpeg } from 'html-to-image'
import { ImageDown } from 'lucide-react'
import '@xyflow/react/dist/style.css'
import { TableNode } from './TableNode'
import type { ParsedSchema, Relation } from '@/types/schema'
import { getLayoutedElements } from '@/lib/dagreLayout'

const nodeTypes: NodeTypes = { table: TableNode }

const edgeStyle = {
  stroke: 'rgba(34, 211, 238, 0.75)',
  strokeWidth: 2,
}
const defaultEdgeOptions = {
  type: 'smoothstep' as const,
  animated: true,
  style: edgeStyle,
  markerEnd: { type: 'arrowclosed' as const, color: 'rgba(34, 211, 238, 0.9)' },
}

function ErdToolbar() {
  const { fitView } = useReactFlow()
  const [exporting, setExporting] = useState(false)

  const handleExportJpg = useCallback(async () => {
    const el = document.querySelector('.react-flow')
    if (!el) return
    setExporting(true)
    try {
      await fitView({ padding: 0.2, duration: 200 })
      await new Promise((r) => setTimeout(r, 300))
      const dataUrl = await toJpeg(el as HTMLElement, {
        quality: 0.92,
        backgroundColor: '#0f172a',
        pixelRatio: 2,
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `erd-schema-${Date.now()}.jpg`
      a.click()
    } finally {
      setExporting(false)
    }
  }, [fitView])

  return (
    <Panel position="bottom-left" className="flex flex-col gap-2 left-4 bottom-4">
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl shadow-lg overflow-hidden flex items-stretch">
        <Controls
          className="!static !flex !gap-0 !rounded-none !border-0 !bg-transparent !shadow-none"
          showInteractive={false}
        />
        <div className="w-px bg-slate-700/50" />
        <button
          type="button"
          onClick={handleExportJpg}
          disabled={exporting}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors disabled:opacity-50"
          title="Сохранить схему в JPG"
        >
          <ImageDown className="w-4 h-4" />
          {exporting ? '…' : 'JPG'}
        </button>
      </div>
      <div className="rounded-xl border border-slate-700/50 overflow-hidden bg-slate-900/95 backdrop-blur-xl shadow-lg">
        <MiniMap className="!static !w-32 !h-24 !rounded-xl" />
      </div>
    </Panel>
  )
}

interface ErdCanvasProps {
  schema: ParsedSchema
  relations: Relation[]
  variant: 'physical' | 'logical'
}

export function ErdCanvas({ schema, relations, variant }: ErdCanvasProps) {
  const physical = variant === 'physical'

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    const fkByTable: Record<string, Record<string, { table: string; column: string }>> = {}
    relations.forEach((r) => {
      if (!fkByTable[r.sourceTable]) fkByTable[r.sourceTable] = {}
      fkByTable[r.sourceTable][r.sourceColumn] = { table: r.targetTable, column: r.targetColumn }
    })
    const nodes = schema.map((table) => ({
      id: table.name,
      type: 'table' as const,
      data: {
        table,
        isPhysical: physical,
        fkMap: fkByTable[table.name] ?? {},
      },
      position: { x: 0, y: 0 },
    }))
    const edges = relations.map((rel, idx) => ({
      id: `e-${rel.sourceTable}-${rel.sourceColumn}-${rel.targetTable}-${idx}`,
      source: rel.sourceTable,
      target: rel.targetTable,
      ...defaultEdgeOptions,
    }))
    return getLayoutedElements(nodes, edges)
  }, [schema, relations, physical])

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  return (
    <div className="absolute inset-0 rounded-xl overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        className="bg-slate-950/20"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="rgba(148, 163, 184, 0.12)" />
        <ErdToolbar />
      </ReactFlow>
    </div>
  )
}
