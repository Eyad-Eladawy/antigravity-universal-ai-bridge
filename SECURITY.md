# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue. Use GitHub's private reporting instead:
**Security tab → "Report a vulnerability"**.

If you can't use GitHub, email **trignod.ai@gmail.com**.

Include what you found, steps to reproduce, and the potential impact. You'll get a reply as soon as possible.

## Scope

This project runs locally: a Chrome extension (`extension/content.js`) and a local MCP server (`extension/bridge.mjs`) that listens on port `4545` and writes a rule block to `~/.gemini/GEMINI.md`. Reports about these components, or about their dependencies, are welcome.

## Supported versions

Only the latest release receives fixes.
