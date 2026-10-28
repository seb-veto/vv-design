import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { getWorldMatrix } from '@open-pencil/scene-graph/coordinate'
import { clipPolygon } from '@open-pencil/scene-graph/geometry'
import Matrix from '@open-pencil/scene-graph/matrix'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import { prototypeActiveInteractions, prototypeConnection, prototypeFrames } from './model'

export interface PrototypeHotspot {
  nodeId: string
  name: string
  destinationId: string
  polygon: Vector[]
}

function corners(node: SceneNode, graph: SceneGraph): Vector[] {
  const world = getWorldMatrix(node, graph)
  return [
    { x: 0, y: 0 },
    { x: node.width, y: 0 },
    { x: node.width, y: node.height },
    { x: 0, y: node.height }
  ].map((point) => Matrix.mapPoint(world, point))
}

/** Paint order, world coordinates and ancestor clips match the image the player renders. */
export function prototypeHotspots(graph: SceneGraph, frameId: string): PrototypeHotspot[] {
  const frame = graph.getNode(frameId)
  const pageId = graph.pageOf(frameId)
  if (!frame || !pageId) return []
  const targets = new Set(prototypeFrames(graph, pageId).map((node) => node.id))
  const hotspots: PrototypeHotspot[] = []
  function visit(node: SceneNode, clips: Vector[][]) {
    if (!node.visible || node.opacity <= 0) return
    let polygon: Vector[] | null = corners(node, graph)
    for (const clip of clips) {
      polygon = clipPolygon(polygon, clip)
      if (!polygon) break
    }
    const reaction = prototypeActiveInteractions(node)
      .map(prototypeConnection)
      .find((entry) => entry && targets.has(entry.destinationId))
    if (reaction && polygon && polygon.length >= 3)
      hotspots.push({
        nodeId: node.id,
        name: node.name,
        destinationId: reaction.destinationId,
        polygon
      })
    if (!polygon && node.clipsContent) return
    const childClips = node.clipsContent ? [...clips, corners(node, graph)] : clips
    for (const child of graph.getChildren(node.id)) visit(child, childClips)
  }
  visit(frame, [])
  return hotspots
}
