# Privacy Policy — Page2Design

**Last updated:** 26 August 2026  
**Product:** Page2Design (Chrome extension)  
**Developer:** [Kazi Rahamatullah](https://github.com/rahmat058)  
**Contact:** [github.com/rahmat058](https://github.com/rahmat058)

This policy describes how Page2Design handles data when you install and use the extension from the Chrome Web Store (or a build of this open-source project).

## Summary

Page2Design is a **local-only** tool. It scans the webpage you choose, stores scan data on your device, and can export a ZIP file to your computer. It does **not** send page content to our servers. There is **no** account system, analytics backend, or remote upload API operated by Page2Design.

## What data is handled

When you click **Scan page** (or use related inspect/export features), the extension may process:

- Visible page content (text, structure, styles)
- Layout and design tokens (colors, typography, spacing)
- Publicly reachable visual assets on that page (images, icons, SVG, fonts) that you choose to include
- Screenshots of the tab when capture is enabled
- Local preferences and temporary scan/session state

The extension is designed **not** to store:

- Password field values
- Hidden field values
- Payment-like input values
- Sensitive URL query parameters (redacted before storage/export)

You control which tab is scanned. Do not scan pages you are not allowed to inspect.

## How data is collected

Data is collected **only on your device**, from the active browser tab, after you start a scan or use inspect/export features. Collection uses Chrome extension APIs declared in the manifest (for example scripting, storage, downloads, and host access to `http`/`https` pages).

## How data is used

Data is used solely to:

- Show the in-extension inspector (overview, colors, typography, content, assets)
- Generate markdown / design reference files
- Build a local ZIP export for your own use with coding agents or design workflows

## How data is stored

- Scan cache and preferences remain on your device (Chrome storage / IndexedDB as applicable)
- Exported ZIP files are saved only where you choose via the browser download dialog
- Stale or incomplete local scan records may be purged automatically

## Sharing and third parties

Page2Design **does not sell** user data and **does not upload** scanned page content to a Page2Design backend.

We do **not** share scanned page content with third parties through this extension.

Note:

- Chrome / Google may process extension usage according to Google’s own policies when you use the Chrome Web Store and Chrome itself.
- If you share an exported ZIP with someone else (for example a teammate or an AI coding tool), that sharing is under **your** control and outside this extension’s transmission.

## Permissions (high level)

| Permission / host access    | Purpose                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `activeTab`                 | Work with the tab you are using                             |
| `scripting`                 | Inject the scanner and on-page inspector                    |
| `storage`                   | Local preferences and local scan/session data               |
| `downloads`                 | Save the exported ZIP / assets to your computer             |
| `sidePanel`                 | Show the UI when a floating overlay cannot run              |
| `http://*/*`, `https://*/*` | Scan normal websites and fetch visible assets when you scan |

## Children’s privacy

Page2Design is not directed at children under 13. Do not use it to collect personal information from children.

## Changes

We may update this policy when the product changes. The “Last updated” date at the top will change when we do. Continued use after an update means you accept the revised policy.

## Contact

Questions about this policy: contact the maintainer via [GitHub](https://github.com/rahmat058) or open a private security advisory when appropriate (see [SECURITY.md](./SECURITY.md)).
