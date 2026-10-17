#!/usr/bin/env python3
"""
Sloth Full-Stack Verification Script
Runs Python unittest discovery, Vitest suite, and TypeScript Vite production build.
"""

import subprocess
import sys

# Ensure UTF-8 output on Windows console
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def run_step(name: str, cmd: list[str]) -> bool:
    print("\n" + "=" * 60)
    print(f"[*] Running: {name}")
    print(f"    Command: {' '.join(cmd)}")
    print("=" * 60)
    proc = subprocess.run(cmd, shell=False)
    if proc.returncode != 0:
        print(f"[FAIL] {name} exited with code {proc.returncode}")
        return False
    print(f"[PASS] {name}")
    return True


def main() -> int:
    steps = [
        ("Python Engine Unit Tests", [sys.executable, "-m", "unittest", "discover", "server/tests"]),
        ("Vitest Frontend Test Suite", ["npm.cmd" if sys.platform == "win32" else "npm", "test"]),
        ("TypeScript & Vite Production Build", ["npm.cmd" if sys.platform == "win32" else "npm", "run", "build"]),
    ]

    for name, cmd in steps:
        if not run_step(name, cmd):
            return 1

    print("\n[SUCCESS] All Sloth test suites and builds passed successfully!\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
