# ChessAI — Detailed changelog

Historical entries reconstructed from commit history, historical project files, documentation and reported user testing. Dates are UTC commit dates, not independently verified publication dates. Implemented fixes are not necessarily regression-tested. Missing historical details are not invented.

## 2.4.0 — Advanced analysis and training — 2026-11-26

### Added
- Independent full-strength Stockfish review worker
- depth 12 and up to one second per position
- per-move SAN, centipawn loss and classifications
- separate White/Black estimated accuracy
- evaluation graph
- previous/next/latest navigation and clickable review entries
- one or three colored arrows
- material balance
- five skill presets.

### Changed / removed
- Review results invalidated on game changes
- historical positions read-only
- review navigation switches to manual mode.

### Fixed / attempted fixes
- Obsolete review workers terminated on game changes.

### Known issues and testing status
- Browser testing pending. Accuracy averages 100 × exp(-loss/200)
- thresholds 20/60/120/250 cp, with Best determined by engine preference. Mate scores and shallow searches can distort ratings. No calibrated Elo, opening recognition, captured-piece icons or Brilliant/Great ratings.

## 2.3.0 — Visual and gameplay improvements — 2026-11-26

### Added
- Green best-move arrow with toggle
- White-perspective evaluation bar and numeric score
- drag-and-drop
- SAN recommendations
- winner/draw banner
- 1–30 second maximum thinking time
- wider full practice tab.

### Changed / removed
- Dark styling, responsive two-column layout and improved piece typography.

### Fixed / attempted fixes
- Arrow coordinates adapt to board flip
- old arrows and evaluation cleared on position change.

### Known issues and testing status
- User reported working in Edge. Font-based pieces
- one arrow only
- no saved games or review yet.

## 2.2.0 — Independent practice board — 2026-11-26

### Added
- chess.js 1.4.0 legal move validation
- click-to-move and legal destination highlighting
- promotion choice
- practice both sides, human vs AI and AI vs AI
- automatic FEN and analysis
- three recommendations
- check/game-over status
- PGN history
- undo/reset/flip
- FEN loading
- full practice tab
- depth and strength controls.

### Changed / removed
- Removed website polling and activeTab/scripting permissions
- bundled chess.js module and license.

### Fixed / attempted fixes
- Local board no longer depends on Share Game
- cancel obsolete searches and ignore stale results.

### Known issues and testing status
- User confirmed core features working. External synchronization removed rather than repaired. No drag/drop, arrows or evaluation bar yet.

## 2.1.2 — Stale-result safeguards — 2026-11-26

### Added
- Default follow mode
- separate manual FEN option.

### Changed / removed
- Clear results when FEN disappears or changes
- cancel old searches
- clear results on manual edit.

### Fixed / attempted fixes
- Attempted to prevent stale recommendations and obsolete engine output.

### Known issues and testing status
- Reported Show moves looked clickable but did nothing in follow mode
- checkbox cleared results without obtaining new FEN
- moves still did not update FEN. Manual mode confirmed working. Superseded by v2.2.0.

## 2.1.1 — Side panel — 2026-11-26

### Added
- Browser side panel permission, default panel and open-panel button.

### Changed / removed
- Collapsed settings
- clearer Share Game instructions.

### Fixed / attempted fixes
- Persistent panel addressed popup workflow interruption.

### Known issues and testing status
- Edge side panel confirmed. After e4, old e2e4 recommendation persisted
- checkbox disabled without visible FEN. Share Game error reported, cause unverified.

## 2.1.0 — Initial analysis integration — 2026-11-26

### Added
- Opt-in visible complete FEN import on exact Chess.com analysis path
- periodic checks
- saved depth/skill
- activeTab and scripting permissions.

### Changed / removed
- Imported FEN can trigger analysis.

### Fixed / attempted fixes
- No confirmed continuous synchronization fix.

### Known issues and testing status
- Page detection and Share Game FEN import confirmed after d4
- FEN unavailable when dialog closed
- popup workflow interrupted. No live multiplayer integration.

## 2.0.0 — Browser engine foundation — 2026-11-26

### Added
- Independent extension-v2
- Stockfish 17.1.0 WASM worker
- UCI initialization
- manual FEN
- three recommendations
- stop
- depth 1–22 and skill 0–20
- build script selects lite single-threaded JS/WASM
- engine license/source information.

### Changed / removed
- No Python, desktop server or pairing key required
- legacy files preserved.

### Fixed / attempted fixes
- FEN/settings validation and engine error handling added.

### Known issues and testing status
- Engine confirmed in Edge. No board or site synchronization
- UCI notation
- npm build required.

## 0.11.0 — Legacy analysis integration — 2026-11-26

### Added
- Dedicated Lichess analysis integration
- standalone practice review panel and explicit FEN copy.

### Changed / removed
- Updated popup version.

### Fixed / attempted fixes
- No additional confirmed bug fixes documented.

### Known issues and testing status
- Desktop engine and pairing remain required.

## 0.10.0 — Authorised BOT companion — 2026-11-26

### Added
- Paired official BOT worker controls
- strength 0–20
- Start/Stop BOT
- status, opponent and Watch game link.

### Changed / removed
- Auto Play dedicated to official BOT accounts.

### Fixed / attempted fixes
- No additional confirmed bug fixes documented.

### Known issues and testing status
- Desktop Online BOT configuration and pairing required.

## 0.9.0 — Local synchronization — 2026-11-26

### Added
- Follow local practice board toggle and sync status.

### Changed / removed
- Manual FEN and thinking time moved into collapsible settings.

### Fixed / attempted fixes
- Local board synchronization implemented.

### Known issues and testing status
- Paired desktop application required.

## 0.8.0 — Practice visuals — 2026-11-26

### Added
- Canvas board preview
- evaluation bar
- FEN input
- thinking time 0.1–5 seconds
- results display.

### Changed / removed
- Improved popup and collapsible connection settings
- desktop analysis integration.

### Fixed / attempted fixes
- No specific verified bug fixes recorded.

### Known issues and testing status
- Preview not independent playable board
- desktop engine required.

## 0.7.0 — Paired analysis — 2026-11-26

### Added
- Paired loopback Stockfish practice-analysis endpoint
- extension analysis controls.

### Changed / removed
- Connected extension to desktop engine.

### Fixed / attempted fixes
- No specific verified bug fixes recorded.

### Known issues and testing status
- Local server and pairing required.

## 0.6 — Desktop resource controls — 2026-11-26

### Added
- Offline engine resource controls
- board flip
- estimated clocks
- subsequent extension manifest, HTML, CSS and JS foundation.

### Changed / removed
- Documented single-branch workflow and extension preview.

### Fixed / attempted fixes
- No specific verified bug fixes recorded.

### Known issues and testing status
- Estimated clocks
- early extension preview only.

## Unnumbered desktop milestone — Online monitoring — 2026-11-26

### Added
- Online board
- clock snapshots
- live match state
- lifetime statistics
- PGN export and completed game archives.

### Changed / removed
- Expanded official BOT monitoring.

### Fixed / attempted fixes
- No specific verified bug fixes recorded.

### Known issues and testing status
- No explicit v0.5 label found.

## 0.4 — Unified desktop interface — 2026-11-26

### Added
- Offline/online tabs
- configurable BOT runner
- isolated worker with private stdin configuration.

### Changed / removed
- Unified practice and official BOT workflows
- documented direct-to-main workflow.

### Fixed / attempted fixes
- No specific verified bug fixes recorded.

### Known issues and testing status
- Historical runtime verification incomplete.

## 0.3 — Official BOT prototype — 2026-11-26

### Added
- online_bot.py and OnlineBot.bat
- dedicated Lichess BOT account API
- casual standard rapid/classical challenges
- automatic moves
- session statistics
- hidden token input and Stockfish path.

### Changed / removed
- Local launcher unchanged.

### Fixed / attempted fixes
- No specific verified bug fixes recorded.

### Known issues and testing status
- No automatic reconnection or concurrent games
- stopping active game may cause timeout
- live API testing pending.

## 0.2 — Local engine modes — 2026-11-26

### Added
- Engine White/Black/both
- automatic turns
- pause
- White-perspective evaluation
- move history
- saved settings.

### Changed / removed
- Expanded initial human vs engine workflow.

### Fixed / attempted fixes
- No specific verified bug fixes recorded.

### Known issues and testing status
- Browser must remain open
- pause takes effect after current calculation
- no official BOT integration yet.

## Initial prototype (unnumbered) — Local chess foundation — 2026-11-26

### Added
- Python backend
- browser board
- install.bat and ChessAI.bat
- requirements, README and gitignore
- Stockfish selection, skill and loopback server
- human White vs engine Black.

### Changed / removed
- Initial project foundation.

### Fixed / attempted fixes
- Fixed piece selection, promotion detection and unequal board rows.

### Known issues and testing status
- Python 3.10+ and separate Stockfish required
- local-only.

## Maintenance policy

Document Added, Changed, Fixed, Removed and Known issues for future releases. Distinguish user-reported regressions from verified fixes and use descriptive commit messages. Preserve existing commit history.
