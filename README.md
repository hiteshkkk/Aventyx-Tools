# Aventyx Tools

Free, open-source developer tools by [Aventryx](https://aventryx.in).

---

## tmx — Zero-dependency tmux session manager

A single bash script that makes tmux sessions effortless. No plugins, no frameworks, no config files — just one file.

### Why?

If you use tmux regularly, you know the pain:
- Forgetting session names (`tmux ls`, copy name, `tmux attach -t ...`)
- Default `Ctrl+b` prefix conflicting with tools like Claude Code, readline, emacs
- No mouse scrolling out of the box
- Tiny scrollback buffer that loses your logs

**tmx** solves all of this in a single script:

```
╔══════════════════════════════════╗
║     tmx 1.0.0 — tmux manager    ║
╚══════════════════════════════════╝

  Active sessions:
  ─────────────────
  [1] dev — 3 windows (created Sat Mar 22 10:30:00 2026)
  [2] prod — 1 windows (created Sat Mar 22 11:00:00 2026)

  [n] New session       [s] Apply settings
  [k] Kill a session    [q] Quit

  > _
```

### Install

**One-liner:**
```bash
curl -fsSL https://raw.githubusercontent.com/hiteshkkk/Aventyx-Tools/main/tmx -o tmx && chmod +x tmx && ./tmx --install
```

**Manual:**
```bash
# Download
curl -fsSL https://raw.githubusercontent.com/hiteshkkk/Aventyx-Tools/main/tmx -o /usr/local/bin/tmx
chmod +x /usr/local/bin/tmx

# Generate optimized ~/.tmux.conf (optional)
tmx --install
```

### Usage

```bash
tmx                  # Interactive menu — list, create, attach, kill
tmx myproject        # Attach to 'myproject' (creates if doesn't exist)
tmx --install        # Install to /usr/local/bin + generate ~/.tmux.conf
tmx --version        # Print version
```

**Inside the interactive menu:**

| Key | Action |
|-----|--------|
| `1`, `2`, ... | Attach to that session |
| `n` | Create a new named session |
| `k` | Kill a session (by number or name) |
| `s` | Apply settings to all active sessions |
| `q` | Quit |
| *any text* | Attach or create session with that name |

### What it configures

| Setting | Value | Why |
|---------|-------|-----|
| **Prefix** | `Ctrl+a` | `Ctrl+b` conflicts with Claude Code, readline, emacs |
| **Mouse** | ON | Scroll, click panes, resize — just works |
| **Scrollback** | 5,000 lines | Enough history without eating RAM |
| **Base index** | 1 | Windows/panes start at 1, not 0 |
| **Escape time** | 0ms | No delay after pressing Escape (important for vim/neovim) |

All settings are applied automatically to new sessions. Use `[s]` in the menu to apply to existing sessions.

### Customize via environment variables

```bash
export TMX_PREFIX="C-a"         # Prefix key (default: Ctrl+a)
export TMX_MOUSE="on"           # Mouse support (default: on)
export TMX_SCROLLBACK=10000     # Scrollback lines (default: 5000)
```

### How it compares

| Tool | Language | Dependencies | Config files | Approach |
|------|----------|-------------|-------------|----------|
| **tmx** | Bash | None | None | Interactive menu, sane defaults |
| tmuxinator | Ruby | Ruby, gem | YAML per project | Project-based layouts |
| tmuxp | Python | Python, pip | YAML/JSON | Session templates |
| sesh | Go | Go binary, fzf | None | Fuzzy finder integration |
| tmux-sessionx | Shell | TPM, fzf | tmux.conf plugin | Tmux plugin with popup |

**Use tmx when you want:** zero setup, no dependencies, one file, works on any server.

**Use something else when you need:** saved layouts per project, fuzzy finding, IDE-like workflows.

### Requirements

- `bash` (4.0+)
- `tmux` (2.0+)
- That's it.

---

## cams-cas — CAMS CAS Statement Automation

Headless Puppeteer script to request a **Consolidated Account Statement (CAS)** from [camsonline.com](https://www.camsonline.com). Covers all mutual fund holdings across all AMCs for a given email/PAN.

```bash
cd cams-cas && npm install
CAMS_EMAIL=investor@example.com CAMS_PASSWORD=MyPass@123 node cams-cas.js
```

- Fully headless — no browser UI needed
- Handles T&C popup, survey popup, ad tabs, Angular datepicker
- Captures CAMS reference number from the success page
- Easy to integrate into any Node.js app (see [cams-cas/README.md](cams-cas/README.md))

---

## More tools coming soon

This repo will host more lightweight developer tools. Star it to stay updated.

---

## License

MIT — do whatever you want.

Built by [Aventryx](https://aventryx.in) — the Financial OS for Indian financial advisors.
