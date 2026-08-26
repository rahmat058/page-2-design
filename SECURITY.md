# Security Policy

Page2Design is a **local-only** Chrome Manifest V3 extension. Scans, IndexedDB storage, and ZIP export stay on the device. There is no backend, analytics, or upload API.

End-user policy for the Chrome Web Store: **[PRIVACY.md](./PRIVACY.md)**.

## Supported versions

| Version                  | Supported                               |
| ------------------------ | --------------------------------------- |
| `1.x` (current `main`)   | Yes                                     |
| Older unpublished builds | No — upgrade to the latest `dist` build |

## What we protect

- **No remote data exfiltration by design** — the extension does not send page content to a server
- **Secret-like fields** — password, hidden, and payment-like input values are never stored in the scan or ZIP
- **Sensitive query parameters** — keys listed in `SENSITIVE_QUERY_KEYS` are redacted (`src/shared/redact.ts`)
- **Message hardening** — runtime messages are versioned; unknown or malformed payloads are dropped
- **Scan TTL** — stale or incomplete local scan records are purged on install/startup

More detail: [ARCHITECTURE.MD — Privacy](./ARCHITECTURE.MD#privacy).

## Permissions (why they exist)

| Permission / host           | Why                                                        |
| --------------------------- | ---------------------------------------------------------- |
| `activeTab`, `scripting`    | Inject the scanner and overlay into the active tab         |
| `storage`                   | Local prefs and IndexedDB-backed scan cache                |
| `downloads`                 | Save the exported ZIP                                      |
| `sidePanel`                 | Inspector fallback on restricted pages                     |
| `http://*/*`, `https://*/*` | Scan and fetch assets without an extra click on every page |

Do not load the extension on pages you are not allowed to inspect. The export ZIP can contain visible page text, styles, and assets from that tab — treat it like a design snapshot of the page you scanned.

## Reporting a vulnerability

**Do not open a public GitHub issue for security reports.**

1. Contact the maintainer privately via [GitHub](https://github.com/rahmat058) (security advisory preferred when available, or a private message).
2. Include: Chrome version, extension version (or commit SHA), steps to reproduce, and impact.
3. Do **not** attach real user passwords, session cookies, or private ZIP exports that contain sensitive site data. Use `fixtures/reference-page.html` or a minimal redacted repro when possible.

We will acknowledge reports as soon as practical and work on a fix for supported versions.

## Out of scope

- Scanning pages you do not have permission to inspect
- Flaws that only appear after loading a malicious or untrusted unpacked build from outside this repository
- Social engineering, phishing, or physical access to an unlocked machine
- Issues in third-party sites that happen to be open in the scanned tab

## Safe contributing

When filing bugs or pull requests:

- Do not paste captured page content, auth tokens, or private ZIP exports
- Prefer the local fixture under `fixtures/` for repros
- Follow [CONTRIBUTING.md](./CONTRIBUTING.md) and the [Code of Conduct](./CODE_OF_CONDUCT.md)
