import json
import sys
from online_bot import run

if __name__ == "__main__":
    try:
        config = json.loads(sys.stdin.readline())
        run(config["token"], config["path"], config["skill"])
    except Exception as exc:
        print("Connection stopped:", type(exc).__name__, flush=True)
        sys.exit(1)
