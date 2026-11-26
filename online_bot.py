"""Casual standard games on an explicit Lichess BOT account."""
import json
import getpass
import urllib.request
import urllib.error
import chess
import chess.engine

BASE = "https://lichess.org"

def request(token, path, post=False):
    req = urllib.request.Request(BASE + path, data=b"" if post else None,
        headers={"Authorization": "Bearer " + token, "User-Agent": "ChessAI-local-bot/0.3"})
    return urllib.request.urlopen(req, timeout=90)

def stream(token, path):
    with request(token, path) as response:
        for line in response:
            if line.strip():
                yield json.loads(line)

def post(token, path):
    with request(token, path, True) as response:
        return json.load(response)

def game(token, engine, gid, username):
    color = None
    last = None
    initial = "startpos"
    for event in stream(token, "/api/bot/game/stream/" + gid):
        if event["type"] == "gameFull":
            if event["variant"]["key"] != "standard" or event.get("rated"):
                post(token, "/api/bot/game/" + gid + "/resign")
                return "skipped"
            color = event["white"].get("id", "").lower() == username
            initial = event.get("initialFen", "startpos")
            state = event["state"]
            opponent = event["black" if color else "white"]
            print("Opponent:", opponent.get("name", "?"), opponent.get("rating", "?"))
            print("Watch: https://lichess.org/" + gid, flush=True)
        elif event["type"] == "gameState" and color is not None:
            state = event
        else:
            continue
        if state["status"] != "started":
            print("Result:", state["status"], state.get("winner", "no winner"))
            if state.get("winner"):
                return "win" if (state["winner"] == "white") == color else "loss"
            return "draw" if state["status"] in ("draw", "stalemate") else "other"
        moves = state.get("moves", "")
        if moves == last:
            continue
        board = chess.Board() if initial == "startpos" else chess.Board(initial)
        for move in moves.split():
            board.push_uci(move)
        if board.turn != color or board.is_game_over():
            continue
        remaining = state.get("wtime" if color else "btime", 1000) / 1000
        increment = state.get("winc" if color else "binc", 0) / 1000
        budget = max(0.01, min(2.0, remaining / 30 + increment / 2, remaining / 4))
        result = engine.play(board, chess.engine.Limit(time=budget))
        post(token, "/api/bot/game/" + gid + "/move/" + result.move.uci())
        last = moves
        print("Played:", board.san(result.move), flush=True)
    return "other"

def run(token, path, skill=20):
    with request(token, "/api/account") as response:
        account = json.load(response)
    if account.get("title") != "BOT":
        print("A dedicated BOT account is required. No moves were submitted.")
        return
    username = account["id"].lower()
    print("Connected as", username, "| Casual standard rapid/classical challenges only.")
    print("Press Ctrl+C to stop. Stopping mid-game may cause a timeout.")
    stats = dict(win=0, loss=0, draw=0, other=0, skipped=0)
    with chess.engine.SimpleEngine.popen_uci(path) as engine:
        engine.configure({"Skill Level": skill})
        while True:
            gid = None
            for event in stream(token, "/api/stream/event"):
                if event["type"] == "challenge":
                    c = event["challenge"]
                    if (not c.get("rated") and c["variant"]["key"] == "standard"
                            and c.get("speed") in ("rapid", "classical")):
                        post(token, "/api/challenge/" + c["id"] + "/accept")
                        print("Challenge accepted", flush=True)
                elif event["type"] == "gameStart":
                    gid = event["game"].get("gameId") or event["game"]["id"]
                    break
            if gid:
                outcome = game(token, engine, gid, username)
                stats[outcome] += 1
                print("Session statistics:", stats, flush=True)

def main():
    token = getpass.getpass("Lichess BOT token (hidden): ").strip()
    path = input("Stockfish executable path: ").strip().strip('"')
    run(token, path)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped.")
    except urllib.error.HTTPError as exc:
        print("Lichess HTTP error:", exc.code, "- check token and account permissions. If 429, wait before restarting.")
    except Exception as exc:
        print("Stopped:", type(exc).__name__, str(exc))
