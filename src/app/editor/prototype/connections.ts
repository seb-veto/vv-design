import { prototypeFrames } from '@open-pencil/core'
import {
  createSceneGeometry,
  type RotationPreview,
  type ViewportTransform
} from '@open-pencil/core/geometry'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import type { Vector } from '@open-pencil/scene-graph/primitives'

export function prototypeLayerVisible(graph: SceneGraph, node: SceneNode): boolean {
  let current: SceneNode | undefined = node
  while (current) {
    if (!current.visible || current.opacity <= 0) return false
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return true
}

export function prototypeAnchor(
  graph: SceneGraph,
  node: SceneNode,
  view: ViewportTransform,
  preview?: RotationPreview | null
) {
  const geometry = createSceneGeometry(graph, preview)
  return {
    point: geometry.toScreen(node, { x: node.width, y: node.height / 2 }, view),
    direction: geometry.direction(node, { x: 1, y: 0 })
  }
}

export function prototypeCurve(
  from: Vector,
  to: Vector,
  start: Vector,
  end: Vector = { x: -1, y: 0 }
): string {
  const bend = Math.max(32, Math.min(120, Math.hypot(to.x - from.x, to.y - from.y) / 2))
  const control = (point: Vector, direction: Vector) => {
    const length = Math.hypot(direction.x, direction.y) || 1
    return {
      x: point.x + (direction.x * bend) / length,
      y: point.y + (direction.y * bend) / length
    }
  }
  const a = control(from, start)
  const b = control(to, end)
  return `M ${from.x} ${from.y} C ${a.x} ${a.y} ${b.x} ${b.y} ${to.x} ${to.y}`
}

export function prototypeLinkGeometry(
  graph: SceneGraph,
  source: SceneNode,
  destination: SceneNode,
  view: ViewportTransform,
  preview?: RotationPreview | null
) {
  const geometry = createSceneGeometry(graph, preview)
  const from = prototypeAnchor(graph, source, view, preview)
  const edges = [
    { point: { x: 0, y: destination.height / 2 }, direction: { x: -1, y: 0 } },
    { point: { x: destination.width, y: destination.height / 2 }, direction: { x: 1, y: 0 } },
    { point: { x: destination.width / 2, y: 0 }, direction: { x: 0, y: -1 } },
    { point: { x: destination.width / 2, y: destination.height }, direction: { x: 0, y: 1 } }
  ].map((edge) => ({
    point: geometry.toScreen(destination, edge.point, view),
    direction: geometry.direction(destination, edge.direction)
  }))
  const closest = edges.reduce((a, b) =>
    Math.hypot(a.point.x - from.point.x, a.point.y - from.point.y) <=
    Math.hypot(b.point.x - from.point.x, b.point.y - from.point.y)
      ? a
      : b
  )
  return {
    from: from.point,
    to: closest.point,
    path: prototypeCurve(from.point, closest.point, from.direction, closest.direction)
  }
}

export function prototypeDestinationAt(
  graph: SceneGraph,
  pageId: string,
  point: Vector,
  view: ViewportTransform,
  preview?: RotationPreview | null
): SceneNode | null {
  const geometry = createSceneGeometry(graph, preview)
  return (
    prototypeFrames(graph, pageId)
      .reverse()
      .find((frame) => {
        if (!prototypeLayerVisible(graph, frame)) return false
        const local = geometry.screenToLocal(frame, point, view)
        return (
          !!local &&
          local.x >= 0 &&
          local.y >= 0 &&
          local.x <= frame.width &&
          local.y <= frame.height
        )
      }) ?? null
  )
}
