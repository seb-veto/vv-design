# Prototype connections in VV Design

Experimental in the VV Design build. Its Prototype sidebar edits on-click, instant navigation between frames on the same page. The player renders the real frame and provides pointer and keyboard hotspots, Back, Restart and Escape to return to editing. Other imported reactions are retained and identified as unsupported; they are not silently converted to clicks.

The editor SDK owns the same connection actions as the sidebar:

```ts
import { createEditor, prototypeHotspots, prototypeStart } from '@open-pencil/core'

const editor = createEditor()
const pageId = editor.state.currentPageId
const first = editor.graph.createNode('FRAME', pageId, { name: 'First', width: 320, height: 240 })
const second = editor.graph.createNode('FRAME', pageId, { name: 'Second', x: 400, width: 320, height: 240 })
const next = editor.graph.createNode('RECTANGLE', first.id, { name: 'Next', width: 100, height: 50 })
editor.setPrototypeConnection(next.id, second.id)
editor.setPrototypeStart(first.id)

const startingFrame = prototypeStart(editor.graph, pageId)
const hotspots = prototypeHotspots(editor.graph, first.id)
```

Connection creation, destination changes, removal and starting-point edits participate in editor undo. The first connection sets the starting point when the page has none. Pass an existing connection ID as the third argument to `setPrototypeConnection` to change its destination; `prototypeConnection` reads supported records from `prototypeInteractions(node)`. Use `removePrototypeConnection(nodeId, connectionId)` to remove a supported connection. Read-only documents and library definitions refuse edits.

Connections use native Figma `prototypeInteractions` GUID records and the page's `prototypeStartNodeID`. Binary `.fig` save/reopen retains the node identities, connection identity, starting point and unrelated imported interactions. Unknown or malformed interactions cannot be edited through these actions. Missing destination frames produce no playable hotspot. World transforms, hidden ancestors and rectangular ancestor clips determine hotspot geometry.

These are editor SDK exports, not scripting globals. This increment adds no `figma.setReactionsAsync` implementation or new CLI/MCP prototype command. Agents can continue using the existing design tools and the Prototype UI; do not invent a script setter from the SDK method names.

The embedded player is a VV adaptation. Canvas connection handles, multiple named flows, overlays, other triggers, animated transitions, interactive-component transitions, scroll behavior, mask/rounded-clip hit areas and full Figma presentation fidelity remain unfinished. This is not full prototype parity.
