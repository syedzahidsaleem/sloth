"""
Script to capture screenshots of Listen Together feature.
Runs FastAPI WebSocket server and Vite preview server, then captures
screenshots with Playwright.
"""

import os
import shutil
import subprocess
import time
from playwright.sync_api import sync_playwright

def run():
    os.makedirs("public/screenshots", exist_ok=True)
    os.makedirs("dist/screenshots", exist_ok=True)

    # 1. Start FastAPI server
    backend = subprocess.Popen(
        ["python", "-m", "uvicorn", "main:app", "--app-dir", "server/listen-together", "--port", "8000"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(1.5)

    # 2. Start Vite preview server
    frontend = subprocess.Popen(
        ["cmd.exe", "/c", "npx", "vite", "preview", "--port", "4173"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(2.0)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            page.goto("http://localhost:4173", wait_until="networkidle")
            time.sleep(1.0)

            # 1. Open Listen Together Popover
            lt_button = page.locator('button[title*="Listen Together"]').first
            if lt_button.count() > 0:
                lt_button.click()
                time.sleep(0.5)

            page.screenshot(path="public/screenshots/14-listen-together-drawer.png")
            shutil.copy("public/screenshots/14-listen-together-drawer.png", "dist/screenshots/14-listen-together-drawer.png")
            print("Captured: 14-listen-together-drawer.png")

            # 2. Click "Start Hosting"
            host_btn = page.locator('button:has-text("Start Hosting")').first
            if host_btn.count() > 0:
                host_btn.click()
                time.sleep(1.0)

            page.screenshot(path="public/screenshots/15-listen-together-active-room.png")
            shutil.copy("public/screenshots/15-listen-together-active-room.png", "dist/screenshots/15-listen-together-active-room.png")
            print("Captured: 15-listen-together-active-room.png")

            browser.close()
    finally:
        backend.terminate()
        frontend.terminate()
        try:
            backend.wait(timeout=2)
            frontend.wait(timeout=2)
        except Exception:
            pass

if __name__ == "__main__":
    run()
