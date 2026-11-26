import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import chess
import chess.engine
import threading
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
from pathlib import Path

class Session:
    def __init__(self, path, skill, seconds):
        self.board = chess.Board()
        self.engine = chess.engine.SimpleEngine.popen_uci(path)
        self.engine.configure({"Skill Level": skill})
        self.seconds = seconds
        self.mode = "black"
        self.paused = False
        self.history = []
        self.evaluation = None

    def engine_turn(self):
        return self.mode == "both" or self.board.turn == (self.mode == "white")

    def push(self, move):
        self.history.append(self.board.san(move))
        self.board.push(move)
        self.evaluation = None

    def tick(self):
        if not self.paused and not self.board.is_game_over() and self.engine_turn():
            result = self.engine.play(self.board, chess.engine.Limit(time=self.seconds))
            self.push(result.move)
            info = self.engine.analyse(self.board, chess.engine.Limit(time=0.1))
            self.evaluation = info["score"].white().score(mate_score=10000)
        return self.state()

    def state(self):
        return {"fen": self.board.fen(), "legal": [m.uci() for m in self.board.legal_moves] if not self.engine_turn() and not self.paused else [], "mode": self.mode, "paused": self.paused, "history": self.history, "evaluation": self.evaluation, "engine_turn": self.engine_turn(), "result": self.board.result() if self.board.is_game_over() else "", "turn": "White" if self.board.turn else "Black"}

    def move(self, uci):
        if self.board.is_game_over() or self.engine_turn() or self.paused:
            raise ValueError("Not your turn")
        move = chess.Move.from_uci(uci)
        if move not in self.board.legal_moves:
            raise ValueError("Illegal move")
        self.push(move)
        return self.state()

def handler_for(session):
    class Handler(BaseHTTPRequestHandler):
        def reply(self, status, data, kind="application/json"):
            self.send_response(status)
            self.send_header("Content-Type", kind)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)
        def get_json(self, data, status=200):
            self.reply(status, json.dumps(data).encode())
        def do_GET(self):
            if self.path == "/":
                self.reply(200, Path(__file__).with_name("board.html").read_bytes(), "text/html; charset=utf-8")
            elif self.path == "/state":
                self.get_json(session.state())
            else:
                self.get_json({"error":"Not found"}, 404)
        def do_POST(self):
            if self.headers.get("Origin") != "http://" + self.headers.get("Host", "") or self.headers.get("Host") != f"127.0.0.1:{self.server.server_port}":
                self.get_json({"error":"Local origin required"}, 403)
                return
            try:
                if self.path == "/move":
                    length = int(self.headers.get("Content-Length", "0"))
                    if not 0 < length <= 1024:
                        raise ValueError("Invalid request")
                    self.get_json(session.move(json.loads(self.rfile.read(length))["move"]))
                elif self.path == "/tick":
                    self.get_json(session.tick())
                elif self.path == "/pause":
                    session.paused = not session.paused
                    self.get_json(session.state())
                elif self.path == "/mode":
                    length = int(self.headers.get("Content-Length", "0"))
                    if not 0 < length <= 1024:
                        raise ValueError("Invalid request")
                    mode = json.loads(self.rfile.read(length))["mode"]
                    if mode not in ("white", "black", "both"):
                        raise ValueError("Invalid mode")
                    session.mode = mode
                    self.get_json(session.state())
                elif self.path == "/reset":
                    session.board.reset()
                    session.history.clear()
                    session.evaluation = None
                    self.get_json(session.state())
                else:
                    self.get_json({"error":"Not found"}, 404)
            except Exception as exc:
                self.get_json({"error":str(exc)}, 400)
    return Handler

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Chess AI | Local browser lab")
        self.geometry("600x400")
        self.configure(bg="#20252c")
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure(".", background="#20252c", foreground="#eeeeee", fieldbackground="#343b45")
        style.map("TButton", background=[("active", "#465365")])
        self.server = self.session = None
        self.path = tk.StringVar()
        self.skill = tk.IntVar(value=10)
        self.seconds = tk.DoubleVar(value=0.5)
        self.status = tk.StringVar(value="Stopped")
        self.config_path = Path.home() / ".chessai-local-settings.json"
        try:
            saved = json.loads(self.config_path.read_text())
            self.path.set(saved.get("path", ""))
            self.skill.set(saved.get("skill", 10))
            self.seconds.set(saved.get("seconds", 0.5))
        except (OSError, ValueError, TypeError, tk.TclError):
            pass
        frame = ttk.Frame(self, padding=24)
        frame.pack(fill="both", expand=True)
        ttk.Label(frame, text="Stockfish browser lab v0.2", font=("Segoe UI", 20, "bold")).pack(anchor="w")
        ttk.Label(frame, text="Local practice • authorised games only").pack(anchor="w", pady=(0,15))
        ttk.Entry(frame, textvariable=self.path).pack(fill="x")
        ttk.Button(frame, text="Choose Stockfish executable", command=self.choose).pack(anchor="w")
        ttk.Label(frame, text="Skill level (0–20)").pack(anchor="w")
        ttk.Spinbox(frame, from_=0, to=20, textvariable=self.skill).pack(anchor="w")
        ttk.Label(frame, text="Thinking time (seconds)").pack(anchor="w")
        ttk.Spinbox(frame, from_=0.1, to=5, increment=0.1, textvariable=self.seconds).pack(anchor="w")
        row = ttk.Frame(frame)
        row.pack(anchor="w", pady=12)
        ttk.Button(row, text="Start local board", command=self.start).pack(side="left")
        ttk.Button(row, text="Stop", command=self.stop).pack(side="left")
        ttk.Label(frame, textvariable=self.status).pack(anchor="w")
        self.protocol("WM_DELETE_WINDOW", self.close)
    def choose(self):
        self.path.set(filedialog.askopenfilename(filetypes=[("Executable", "*.exe"), ("All files", "*")]))
    def start(self):
        if self.server:
            return
        try:
            skill, seconds = self.skill.get(), self.seconds.get()
            if not 0 <= skill <= 20 or not 0.1 <= seconds <= 5:
                raise ValueError("Invalid engine settings")
            self.session = Session(self.path.get(), skill, seconds)
            try:
                self.config_path.write_text(json.dumps({"path": self.path.get(), "skill": skill, "seconds": seconds}))
            except OSError:
                pass
            self.server = HTTPServer(("127.0.0.1", 0), handler_for(self.session))
            threading.Thread(target=self.server.serve_forever, daemon=True).start()
            url = f"http://127.0.0.1:{self.server.server_port}"
            self.status.set(url)
            webbrowser.open(url)
        except Exception as exc:
            self.stop()
            messagebox.showerror("Startup failed", str(exc))
    def stop(self):
        if self.server:
            self.server.shutdown()
            self.server.server_close()
            self.server = None
        if self.session:
            self.session.engine.quit()
            self.session = None
        self.status.set("Stopped")
    def close(self):
        self.stop()
        self.destroy()

if __name__ == "__main__":
    App().mainloop()
