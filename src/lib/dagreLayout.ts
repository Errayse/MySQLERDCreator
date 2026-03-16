import dagre from 'dagre'
import type { Node, Edge } from '@xyflow/react'

const NODE_WIDTH = 260
const ROW_HEIGHT_PHYSICAL = 40
const ROW_HEIGHT_LOGICAL = 30
const HEADER_HEIGHT = 56
const MIN_NODE_HEIGHT = 120
const NODESEP = 100
const RANKSEP = 90
const MARGIN = 48

interface TableNodeData {
  table?: { columns?: { length: number }[] }
  isPhysical?: boolean
  [key: string]: unknown
}

function getNodeHeight(data: TableNodeData): number {
  const colCount = data?.table?.columns?.length ?? 5
  const rowH = data?.isPhysical !== false ? ROW_HEIGHT_PHYSICAL : ROW_HEIGHT_LOGICAL
  return Math.max(MIN_NODE_HEIGHT, HEADER_HEIGHT + colCount * rowH)
}

export function getLayoutedElements(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph({ compound: true })
  g.setGraph({
    rankdir: 'TB',
    align: 'UL',
    nodesep: NODESEP,
    ranksep: RANKSEP,
    marginx: MARGIN,
    marginy: MARGIN,
    ranker: 'network-simplex',
    acyclicer: 'greedy',
  })
  g.setDefaultEdgeLabel(() => ({}))

  const dimensions = new Map<string, { width: number; height: number }>()
  nodes.forEach((node) => {
    const height = getNodeHeight((node.data ?? {}) as TableNodeData)
    dimensions.set(node.id, { width: NODE_WIDTH, height })
    g.setNode(node.id, { width: NODE_WIDTH, height })
  })
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  const layoutedNodes = nodes.map((node) => {
    const n = g.node(node.id)
    const { width, height } = dimensions.get(node.id) ?? { width: NODE_WIDTH, height: MIN_NODE_HEIGHT }
    return {
      ...node,
      position: { x: n.x - width / 2, y: n.y - height / 2 },
    }
  })

  return { nodes: layoutedNodes, edges }
}
