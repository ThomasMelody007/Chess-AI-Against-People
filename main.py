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

    def state(self):
        return {"fen": self.board.fen(), "legal": [m.uci() for m in self.board.legal_moves], "result": self.board.result() if self.board.is_game_over() else "", "turn": "White" if self.board.turn else "Black"}

    def move(self, uci):
        if self.board.is_game_over() or not self.board.turn:
            raise ValueError("Not your turn")
        self.board.push_uci(uci)
        if not self.board.is_game_over():
            result = self.engine.play(self.board, chess.engine.Limit(time=self.seconds))
            self.board.push(result.move)
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
                elif self.path == "/reset":
                    session.board.reset()
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
        self.geometry("540x350")
        self.server = self.session = None
        self.path = tk.StringVar()
        self.skill = tk.IntVar(value=10)
        self.seconds = tk.DoubleVar(value=0.5)
        self.status = tk.StringVar(value="Stopped")
        frame = ttk.Frame(self, padding=24)
        frame.pack(fill="both", expand=True)
        ttk.Label(frame, text="Stockfish browser lab", font=("Segoe UI", 20, "bold")).pack(anchor="w")
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
