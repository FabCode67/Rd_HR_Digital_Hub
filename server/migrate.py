#!/usr/bin/env python
"""
migrate.py — Alembic migration helper for Rwanda HR Digital Hub.

Usage (run from the server/ directory):

  python migrate.py upgrade          # apply all pending migrations
  python migrate.py downgrade        # roll back one step
  python migrate.py downgrade base   # roll ALL the way back
  python migrate.py revision "msg"   # auto-generate migration from model changes
  python migrate.py history          # show migration history
  python migrate.py current          # show current DB revision
  python migrate.py check            # exit 1 if pending migrations exist
"""

import sys
import os
import subprocess
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parent

# Find the alembic executable next to the current python interpreter
# e.g. C:\Python311\Scripts\alembic.exe
PYTHON = Path(sys.executable)
SCRIPTS = PYTHON.parent / "Scripts"
ALEMBIC_EXE = SCRIPTS / "alembic.exe"

if not ALEMBIC_EXE.exists():
    # Try Unix-style (no .exe)
    ALEMBIC_EXE = SCRIPTS / "alembic"

if not ALEMBIC_EXE.exists():
    print(f"ERROR: Cannot find alembic executable at {SCRIPTS}")
    print(f"Run: {sys.executable} -m pip install alembic==1.12.1")
    sys.exit(1)


def run(*args: str) -> int:
    """Run an alembic command using the Scripts/alembic.exe directly."""
    cmd = [str(ALEMBIC_EXE)] + list(args)
    result = subprocess.run(cmd, cwd=str(SERVER_DIR))
    return result.returncode


def main() -> None:
    raw_args = sys.argv[1:]
    if not raw_args:
        print(__doc__)
        sys.exit(0)

    cmd = raw_args[0].lower()

    if cmd == "upgrade":
        target = raw_args[1] if len(raw_args) > 1 else "head"
        print(f"[migrate] Upgrading to: {target}")
        sys.exit(run("upgrade", target))

    elif cmd == "downgrade":
        target = raw_args[1] if len(raw_args) > 1 else "-1"
        print(f"[migrate] Downgrading to: {target}")
        sys.exit(run("downgrade", target))

    elif cmd == "revision":
        msg = raw_args[1] if len(raw_args) > 1 else "auto"
        print(f"[migrate] Generating migration: '{msg}'")
        sys.exit(run("revision", "--autogenerate", "-m", msg))

    elif cmd == "history":
        sys.exit(run("history", "--verbose"))

    elif cmd == "current":
        sys.exit(run("current", "--verbose"))

    elif cmd in ("check", "status"):
        sys.exit(run("check"))

    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
