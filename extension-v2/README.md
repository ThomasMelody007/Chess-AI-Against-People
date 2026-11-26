# ChessAI v2

Standalone browser extension project. The existing desktop application and extension remain unchanged.

## Planned scope
- Bundled Stockfish WebAssembly engine, no Python or pairing key.
- Dedicated analysis and permitted computer practice integrations, starting with Chess.com.
- Automated play only in explicitly authorised environments, such as our own practice board or official Lichess BOT API.
- No engine assistance in ordinary live multiplayer games.

## Status
v2.0 engine confirmed by user in Edge. v2.1 adds explicit opt-in FEN following on the exact https://www.chess.com/analysis page while the popup is open. It reads a unique visible complete FEN input only; if unavailable, use manual FEN. No live game integration. Site compatibility remains untested. Build with npm.cmd install and npm.cmd run build, then load dist in Edge or Chrome.

## v2.1.1
Adds browser side panel access and collapses advanced settings by default. Share Game FEN import was confirmed in Edge in v2.1.0. The side panel and its active-tab permission behavior still require testing. Import still requires a visible FEN field; automatic extraction without Share Game is not implemented. Move output remains UCI notation.

## v2.1.2
Follow mode defaults on and clears results when the visible FEN disappears or changes. Untick to use manual FEN. This is a stale-result safeguard, not continuous board extraction: Share Game is still required. Browser runtime testing pending.

## v2.2.0
Standalone local board using chess.js 1.4.0. Click source and destination, automatic analysis, FEN loading, PGN history, undo, flip, AI modes. Website polling removed. Browser testing pending. Build with npm.cmd install and npm.cmd run build. Drag/drop, arrows, evaluation bar and themes deferred.

## v2.3.0
Local practice UI: best move arrow, White-perspective evaluation, drag/drop, SAN recommendations, game-over banner, adjustable maximum thinking time and wider practice tab. Existing engine and chess.js dependencies unchanged. Browser testing pending; custom piece artwork and remaining medium-priority features deferred.
