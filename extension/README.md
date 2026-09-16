# Oh My Share Chrome Extension

A Chrome extension to share HTML and code snippets instantly with Oh My Share.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this repository
5. The extension icon should appear in your Chrome toolbar

## Features

### 1. Share Selection
- Click on any HTML element on a webpage
- Click the Oh My Share extension icon
- Click "Share Selection"
- The HTML of the selected element will be uploaded

### 2. Share Code
- Click the Oh My Share extension icon
- Switch to the "Code" tab
- Paste your HTML or code
- Select the language type
- Click "Share Code"

### 3. Right-click Context Menu
- Right-click on any element, link, or image
- Select "Share with Oh My Share"
- The extension will open with the content ready to share

## Permissions

- `activeTab`: Access to the current tab for element selection
- `contextMenus`: Right-click menu integration
- `storage`: Store selected elements
- `host_permissions`: Upload to openanthropic.com

## Development

### Files

- `manifest.json`: Extension configuration
- `popup.html`: Extension popup UI
- `popup.js`: Popup logic
- `content.js`: Content script for element selection
- `content.css`: Content styles
- `background.js`: Background service worker
- `icons/`: Extension icons

### Build

No build process required. Simply load the `extension` folder in Chrome's developer mode.

## Usage

1. **Quick Share**: Click the extension icon, paste code, and share
2. **Element Share**: Click on an element, then share its HTML
3. **Context Menu**: Right-click any element and share directly

## API

The extension uses the Oh My Share API:
- `POST https://openanthropic.com/api/upload`
- Body: `{ content: string, language: string }`
- Response: `{ url: string }`

## License

MIT
