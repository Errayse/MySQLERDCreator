import dagre from 'dagre'
import type { Node, Edge } from '@xyflow/react'

const NODE_WIDTH = 240
const NODE_HEIGHT = 280
const NODESEP = 80
const RANKSEP = 56

export function getLayoutedElements(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph({ compound: true })
  g.setGraph({
    rankdir: 'TB',
    nodesep: NODESEP,
    ranksep: RANKSEP,
    marginx: 24,
    marginy: 24,
    ranker: 'tight-tree',
  })
  g.setDefaultEdgeLabel(() => ({}))

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  const layoutedNodes = nodes.map((node) => {
    const n = g.node(node.id)
    return {
      ...node,
      position: { x: n.x - NODE_WIDTH / 2, y: n.y - NODE_HEIGHT / 2 },
    }
  })

  return { nodes: layoutedNodes, edges }
}
