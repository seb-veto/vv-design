# Design in VV

This fork embeds the OpenPencil editor in a VV plugin called **Design**. Figma visual parity is unfinished. The MIT donor engine, native `.fig` codec, CLI and MCP remain the foundation.

Build the packages with Bun 1.4.2, then build the browser application with `VITE_VV_DESIGN=1`, `VITE_OPENPENCIL_CLOUD=off`, `OPENPENCIL_DEV_MCP_PORT=46180` and `OPENPENCIL_DEV_ORIGIN=http://127.0.0.1:46179`. The VV wrapper serves those compiled assets and starts the authenticated MCP companion; the editor reads its credential from a same-origin runtime endpoint. Credentials are never baked into assets.

The Agents pane connects to BB server conversations through the host-owned `ThreadChat`, retaining BB models, history, composer and permissions. Conversation selection is stored in this plugin's BB key-value namespace. Opening or selecting a conversation sends no message. Donor AI setup, model configuration and usage prompts are suppressed in VV mode.

VV saves bind to the companion's root-confined file store. Keyboard Save prompts for the initial name; subsequent saves and the existing debounced autosave write the same file. Saved file tabs reopen after reload. Unsaved documents continue to use the donor's recovery dialog. A browser closing before its pending save completes is not a durability guarantee.

Agent commands use the same editor and store: `bb design documents list --json`, `bb design documents save --path <path> --json`, `bb design eval -c '<code>' --json`. The intended editor must be connected. Multiple simultaneously connected browser clients have not been qualified.

Verified in the installed VV browser host: agent editing, numeric inspector editing, `.fig` save/open, PNG export, keyboard Save, autosave and host reload with restored frame geometry. Live BB model-turn acceptance, native-window acceptance, full Figma visual and interaction parity, multi-client behavior, source/plugin distribution packaging and the complete upstream check suite remain open.
