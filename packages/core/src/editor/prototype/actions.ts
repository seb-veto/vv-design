import { stringToGuid } from '@open-pencil/kiwi/fig/guid'
import type { SceneNode } from '@open-pencil/scene-graph'

import { assertNodeEditable } from '#core/editor/capabilities'
import type { EditorContext } from '#core/editor/types'

import {
  hasPrototypeClick,
  newPrototypeInteraction,
  prototypeConnection,
  prototypeFrame,
  prototypeFrames,
  prototypeInteractions,
  prototypeSource
} from './model'

export function createPrototypeActions(
  ctx: EditorContext,
  update: (id: string, values: Partial<SceneNode>, label?: string) => void,
  flushPending: () => void
) {
  function setPrototypeConnection(
    nodeId: string,
    destinationId: string,
    connectionId?: string
  ): void {
    const node = ctx.graph.getNode(nodeId)
    const pageId = ctx.graph.pageOf(nodeId)
    if (
      !node ||
      !pageId ||
      !prototypeFrame(ctx.graph, nodeId) ||
      !prototypeFrames(ctx.graph, pageId).some((frame) => frame.id === destinationId)
    )
      throw new Error('Prototype destinations must be frames on the same page')
    assertNodeEditable(ctx.graph, nodeId)
    const raw = node.source.fig.rawNodeFields.prototypeInteractions
    if (raw !== undefined && !Array.isArray(raw))
      throw new Error('This prototype interaction cannot be edited')
    const interactions = structuredClone(prototypeInteractions(node))
    if (connectionId) {
      const index = interactions.findIndex(
        (entry) => prototypeConnection(entry)?.id === connectionId
      )
      if (index === -1) throw new Error('This prototype interaction cannot be edited')
      // Keep the existing identity and all unrelated archive metadata.
      const previous = interactions[index] as { actions: Array<Record<string, unknown>> }
      previous.actions[0].transitionNodeID = stringToGuid(destinationId)
    } else {
      if (hasPrototypeClick(node)) throw new Error('This layer already has an on-click interaction')
      interactions.push(newPrototypeInteraction(destinationId))
    }
    flushPending()
    ctx.undo.runBatch('Prototype connection', () => {
      update(nodeId, { source: prototypeSource(node, interactions) }, 'Prototype connection')
      const page = ctx.graph.getNode(pageId)
      const frame = prototypeFrame(ctx.graph, nodeId)
      if (
        !connectionId &&
        page &&
        frame &&
        page.source.fig.rawNodeFields.prototypeStartNodeID === undefined
      )
        setPrototypeStart(frame.id)
    })
  }

  function removePrototypeConnection(nodeId: string, connectionId: string): void {
    const node = ctx.graph.getNode(nodeId)
    if (!node) throw new Error('Prototype layer no longer exists')
    assertNodeEditable(ctx.graph, nodeId)
    const interactions = prototypeInteractions(node)
    if (!interactions.some((entry) => prototypeConnection(entry)?.id === connectionId))
      throw new Error('This prototype interaction cannot be edited')
    flushPending()
    update(
      nodeId,
      {
        source: prototypeSource(
          node,
          interactions.filter((entry) => prototypeConnection(entry)?.id !== connectionId)
        )
      },
      'Remove prototype connection'
    )
  }

  function setPrototypeStart(frameId: string): void {
    const pageId = ctx.graph.pageOf(frameId)
    const page = pageId ? ctx.graph.getNode(pageId) : null
    if (!page || !prototypeFrames(ctx.graph, page.id).some((frame) => frame.id === frameId))
      throw new Error('A prototype starts at a top-level frame')
    assertNodeEditable(ctx.graph, page.id)
    flushPending()
    const source = structuredClone(page.source)
    source.fig.rawNodeFields.prototypeStartNodeID = stringToGuid(frameId)
    update(page.id, { source }, 'Prototype starting point')
  }

  return { setPrototypeConnection, removePrototypeConnection, setPrototypeStart }
}
