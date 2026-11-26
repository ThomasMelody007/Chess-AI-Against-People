# Chess AI — authorised browser prototype

Windows control panel for Stockfish. Stage 1 supports a local browser chessboard served on loopback only. It does not connect to live human games on third-party sites.

## Setup
Install Python 3.10+ and download Stockfish from https://stockfishchess.org/download/.
Run install.bat, then ChessAI.bat. Select the Stockfish executable, choose a skill level and click Start local board. Open the displayed local URL in your browser. Play White; Stockfish replies as Black. Stop closes the local server. No account credentials are needed.

The next stage can add an official Lichess BOT API integration.
