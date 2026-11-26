# Chess AI — authorised browser prototype

Windows control panel for Stockfish. Stage 1 supports a local browser chessboard served on loopback only. It does not connect to live human games on third-party sites.

## Setup
Install Python 3.10+ and download Stockfish from https://stockfishchess.org/download/.
Run install.bat, then ChessAI.bat. Select the Stockfish executable, choose a skill level and click Start local board. Open the displayed local URL in your browser. Play White; Stockfish replies as Black. Stop closes the local server. No account credentials are needed.

The next stage can add an official Lichess BOT API integration.

## Version 0.2
Select which colour the engine plays in the browser, or Both sides for AI vs AI. Pause stops future engine moves after the current calculation finishes. The browser must remain open for automatic turns. Evaluation is from White's perspective and updates after engine moves. Settings are saved locally on successful startup. Official online bot integration is not yet implemented.

## Version 0.3 — online bot preview
Run OnlineBot.bat. Use a dedicated Lichess BOT account, with a personal token containing bot:play and challenge:write scopes. See https://lichess.org/api and https://lichess.org/account/oauth/token. A fresh account can be upgraded using the official bot account upgrade endpoint; upgrading is permanent. Enter the token locally (hidden input) and the Stockfish exe path. Never commit tokens. The prototype accepts casual standard rapid/classical challenges, plays automatically and prints results and session statistics. Ctrl+C stops the process; an active game may time out. No automatic reconnection or concurrent games are supported. The local launcher is unchanged. Live API testing is pending.
