# Chrome Web Store listing — Page2Design

**Last updated:** 28 August 2026

Paste the short line into **Summary** (max 132 characters) and the long block into **Description**. Both are plain text — no Markdown.

## Summary

```text
Scan a webpage and export an agent-ready design reference package. All processing stays on this device.
```

## Description

```text
Page2Design turns any normal webpage into an agent-ready design reference package — scanned and packaged entirely on your device.

Use it when you want Cursor, Claude Code, or a similar coding agent to recreate a page from what is actually visible in the browser, not from guessed source code.

WHAT IT DOES
• Scan the current tab for layout, typography, colors, content, and visual assets
• Inspect elements on the page with a floating inspector (or Chrome side panel on restricted pages)
• Review a Design System: color ramps, type scale, component previews, tokens, and CSS / Tailwind / shadcn / JSON export
• Preview the live page at phone, tablet, and desktop breakpoints (More Options → Responsive) without resizing or debugging the tab
• Preview design tokens, assets, and content in one place
• Export one ZIP your AI tools can follow: AGENTS.md, design docs, prompts, references, screenshots, and assets

WHY INSTALL IT
• Faster handoff from live UI to rebuildable design notes
• Clear, structured output agents can use without reverse-engineering your code
• Honest about limits — gaps go into limitations.json instead of invented details

PRIVACY
• Local-only: scans stay on your device (IndexedDB)
• No account and no backend upload of page content
• Visible copy only — passwords, hidden fields, and payment-like inputs are never stored
• Sensitive query params are redacted

HOW TO USE
1. Open a normal http(s) website
2. Open Page2Design
3. Click Scan page
4. Review Overview, Design System, Typography, Content, and Assets
5. Optionally open More Options → Responsive and pick a device to preview breakpoints
6. Generate Markdown if you want a preview of the ZIP files
7. Export the ZIP and point your coding agent at AGENTS.md

If the inspector looks stuck or shows an old scan, do not scan first. Open More Options → Clear local scan data, then scan again.

NOTES
• Works on regular websites — not chrome://, edge://, or Chrome Web Store pages
• Captures the observed page, not original source, React trees, or private form values
• Extra viewport capture may briefly resize the window, then restore it
• Responsive preview is an iframe of the current page. A few sites still block framing with JavaScript; the live tab is never debugger-emulated

Open source (MIT). Built for developers, designers, and anyone shipping UI with AI coding tools.
```
