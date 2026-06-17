# Holmes

A user-friendly desktop GUI for [Sherlock](https://github.com/sherlock-project/sherlock), the open-source username search tool. Find social media profiles across 400+ websites — no terminal required.

---

## Features

- **Multi-username search** — search multiple usernames at once, filter results per username
- **Live results** — see matches appear in real time as they're found
- **Category filtering** — filter results by site category (Social, Music, Gaming, etc.)
- **Search history** — every search is saved locally with full results, timestamps, and stats
- **Re-run past searches** — replay any previous search with one click
- **Customizable settings** — timeout, proxy, Tor routing, output formats (TXT, CSV, XLSX)
- **Export results** — save found profiles to your preferred format and directory
- **NSFW toggle** — optionally include adult sites in searches
- **Cross-platform** — Windows installer with Start Menu and Desktop shortcuts

---

## Installation

1. Download the latest `Holmes_Setup.exe` from [Releases](https://github.com/MewMeow69/Holmes/releases)
2. Run the installer — no configuration needed
3. Launch Holmes from the Start Menu or Desktop shortcut

The app bundles everything it needs. No Python, no terminals, no setup.

---

## Attribution

Holmes is a GUI wrapper around the incredible [Sherlock](https://github.com/sherlock-project/sherlock) project by [Siddharth Dushantha](https://github.com/sdushantha) and [contributors](https://github.com/sherlock-project/sherlock/graphs/contributors).

Sherlock does the heavy lifting — crawling 400+ websites to check if a username exists. Holmes wraps that power in a desktop app anyone can use.

If you find Holmes useful, please star both projects:
- [sherlock-project/sherlock](https://github.com/sherlock-project/sherlock)
- [MewMeow69/Holmes](https://github.com/MewMeow69/Holmes)

---

## Building from source

```powershell
# Prerequisites: Node.js, Rust, VS Build Tools (MSVC), Python 3.13+, PyInstaller
# 1. Build the Sherlock CLI sidecar
pyinstaller --onefile --strip --noconfirm --name sherlock-cli-x86_64-pc-windows-msvc --distpath src-tauri/binaries sherlock_cli.py

# 2. Install frontend dependencies
npm install

# 3. Run in development mode
.\dev.ps1

# 4. Build the installer
.\build.ps1
# Installer output: src-tauri/target/release/bundle/nsis/
```

---

## License

MIT — see [LICENSE](LICENSE) for details.

Sherlock is available under the [MIT License](https://github.com/sherlock-project/sherlock/blob/master/LICENSE).
