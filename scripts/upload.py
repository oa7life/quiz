import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request

TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
FILE_ID = os.environ["FILE_ID"]
FILE_NAME = os.environ["FILE_NAME"]
CHAT_ID = os.environ["CHAT_ID"]
REPO = os.environ.get("REPO", "oa7life/quiz")
MAX_BYTES = 20 * 1024 * 1024


def api(method, payload):
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{TOKEN}/{method}",
        data=json.dumps(payload).encode(),
        headers={"content-type": "application/json"},
    )
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def send(text):
    api("sendMessage", {"chat_id": CHAT_ID, "text": text, "disable_web_page_preview": True})


def sanitize(name):
    name = os.path.basename(name.replace("\\", "/"))
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name).lstrip(".")
    if not re.search(r"\.html?$", name, re.I):
        raise ValueError("Not an .html file")
    return name


def preview_url(repo, name):
    quoted = urllib.parse.quote(name)
    return f"https://htmlpreview.github.io/?https://github.com/{repo}/blob/main/{quoted}"


def run(*cmd):
    subprocess.run(cmd, check=True)


def main():
    name = sanitize(FILE_NAME)
    info = api("getFile", {"file_id": FILE_ID})["result"]
    if info.get("file_size", 0) > MAX_BYTES:
        raise ValueError("File too large")
    with urllib.request.urlopen(f"https://api.telegram.org/file/bot{TOKEN}/{info['file_path']}") as r:
        data = r.read()
    with open(name, "wb") as f:
        f.write(data)

    run("git", "config", "user.name", "telegram-bot")
    run("git", "config", "user.email", "telegram-bot@users.noreply.github.com")
    run("git", "add", "--", name)
    changed = subprocess.run(["git", "diff", "--cached", "--quiet"]).returncode != 0
    if changed:
        run("git", "commit", "-m", f"Add {name} via Telegram bot")
        run("git", "pull", "--rebase", "origin", "main")
        run("git", "push", "origin", "HEAD:main")
    send(f"✅ {name}\n{preview_url(REPO, name)}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        try:
            send(f"❌ Upload failed: {e}")
        finally:
            sys.exit(1)
