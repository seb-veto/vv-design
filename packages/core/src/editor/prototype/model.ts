import { guidToString, stringToGuid } from '@open-pencil/kiwi/fig/guid'
import { generateId, type SceneGraph, type SceneNode } from '@open-pencil/scene-graph'

export interface PrototypeConnection {
  id: string
  destinationId: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function record(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

function uint32(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 0xffffffff
}

function guid(value: unknown): string | null {
  const entry = record(value)
  return entry && uint32(entry.sessionID) && uint32(entry.localID)
    ? guidToString({ sessionID: entry.sessionID, localID: entry.localID })
    : null
}

export function prototypeInteractions(node: SceneNode): unknown[] {
  const value = node.source.fig.rawNodeFields.prototypeInteractions
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

/** Read only the implemented reaction; other triggers/actions remain intact in the archive. */
export function prototypeConnection(value: unknown): PrototypeConnection | null {
  const interaction = record(value)
  if (
    !interaction ||
    interaction.isDeleted === true ||
    record(interaction.event)?.interactionType !== 'ON_CLICK'
  )
    return null
  const actions = interaction.actions
  const action = Array.isArray(actions) && actions.length === 1 ? record(actions[0]) : null
  if (
    !action ||
    action.connectionType !== 'INTERNAL_NODE' ||
    ![undefined, 'NAVIGATE'].includes(action.navigationType as string | undefined) ||
    ![undefined, 'INSTANT_TRANSITION'].includes(action.transitionType as string | undefined)
  )
    return null
  const id = guid(interaction.id)
  const destinationId = guid(action.transitionNodeID)
  return id && destinationId ? { id, destinationId } : null
}

export function prototypeFrames(graph: SceneGraph, pageId: string): SceneNode[] {
  return graph.getChildren(pageId).flatMap((node) => {
    if (node.type === 'FRAME') return [node]
    return node.type === 'SECTION' ? prototypeFrames(graph, node.id) : []
  })
}

export function prototypeFrame(graph: SceneGraph, nodeId: string): SceneNode | null {
  const page = graph.pageOf(nodeId)
  if (!page) return null
  const frames = new Set(prototypeFrames(graph, page).map((node) => node.id))
  let node = graph.getNode(nodeId)
  while (node) {
    if (frames.has(node.id)) return node
    node = node.parentId ? graph.getNode(node.parentId) : undefined
  }
  return null
}

export function prototypeStart(graph: SceneGraph, pageId: string): SceneNode | null {
  const frames = prototypeFrames(graph, pageId)
  const id = guid(graph.getNode(pageId)?.source.fig.rawNodeFields.prototypeStartNodeID)
  return frames.find((node) => node.id === id) ?? frames[0] ?? null
}

export function prototypeSource(node: SceneNode, interactions: unknown[]): SceneNode['source'] {
  const source = structuredClone(node.source)
  source.fig.rawNodeFields.prototypeInteractions = interactions
  return source
}

export function newPrototypeInteraction(destinationId: string): unknown {
  return {
    id: stringToGuid(generateId()),
    event: { interactionType: 'ON_CLICK' },
    actions: [
      {
        connectionType: 'INTERNAL_NODE',
        navigationType: 'NAVIGATE',
        transitionType: 'INSTANT_TRANSITION',
        transitionNodeID: stringToGuid(destinationId)
      }
    ]
  }
}

export function hasPrototypeClick(node: SceneNode): boolean {
  return prototypeInteractions(node).some((value) => {
    const interaction = record(value)
    return (
      interaction?.isDeleted !== true && record(interaction?.event)?.interactionType === 'ON_CLICK'
    )
  })
}

export function prototypeActiveInteractions(node: SceneNode): unknown[] {
  return prototypeInteractions(node).filter((value) => record(value)?.isDeleted !== true)
}

export function hasPrototypeInteractions(graph: SceneGraph, pageId: string): boolean {
  for (const node of graph.getAllNodes()) {
    if (graph.pageOf(node.id) === pageId && prototypeActiveInteractions(node).length > 0)
      return true
  }
  return false
}
