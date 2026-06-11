# CryptoJack Guard

A powerful Chrome browser extension that detects and prevents unauthorized cryptocurrency mining (cryptojacking) on websites you visit.

## Features

✅ **Signature-Based Detection** - Scans for known cryptojacking scripts (Coinhive, CryptoLoot, etc.)  
✅ **CPU Monitoring** - Detects suspicious CPU usage spikes caused by mining activity  
✅ **WebAssembly Inspection** - Analyzes compiled code for crypto-mining patterns  
✅ **Real-Time Alerts** - Get notified immediately when threats are detected  
✅ **Site Whitelisting** - Trust specific sites and disable monitoring for them  
✅ **Dashboard** - View threat history and site status at a glance  

## How It Works

1. **Signature Scanner** - Monitors all scripts loaded on a page against a database of known miners
2. **CPU Monitor** - Watches event-loop delays to detect resource-heavy mining processes
3. **WASM Interceptor** - Inspects WebAssembly binaries for cryptographic mining keywords
4. **Background Service** - Coordinates detection signals and manages alerts

## Installation

### For Development
1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select the project folder

### For Users
Download from the Chrome Web Store (coming soon)

## Project Structure

```
cryptojacking-detector/
├── manifest.json              # Extension configuration
├── background/
│   └── service-worker.js      # Background service worker
├── content/
│   ├── content-script.js      # Main content script
│   ├── cpu-monitor.js         # CPU usage detection
│   ├── signature-scanner.js   # Script signature detection
│   └── wasm-interceptor.js    # WebAssembly monitoring
├── popup/
│   ├── popup.html             # Dashboard UI
│   ├── popup.js               # Dashboard logic
│   └── popup.css              # Dashboard styling
├── shared/
│   ├── signatures.js          # Known miner database
│   └── storage-api.js         # Storage utilities
├── icons/                     # Extension icons
└── test/                      # Testing files
```

## Configuration

Modify the known signatures in `shared/signatures.js`:

```javascript
var KNOWN_MINER_URLS = [
  'coinhive.com/lib/coinhive.min.js',
  'coin-hive.com',
  // Add more known miners here
];
```

## Development

### Creating a Feature
```bash
git checkout develop
git checkout -b feature/your-feature-name
# Make changes, then:
git add .
git commit -m "Description of changes"
git push -u origin feature/your-feature-name
# Create a Pull Request on GitHub
```

### Releasing
```bash
git checkout main
git merge develop
git push origin main
```

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Test thoroughly
4. Submit a Pull Request
5. After review and merge, changes will be in the next release

## Security

CryptoJack Guard prioritizes your privacy:
- No telemetry or data collection
- All detection happens locally in your browser
- No communication with external servers (except for optional threat reporting)

## License

MIT License - See LICENSE file for details

## Support

Found a bug? Report it on [GitHub Issues](https://github.com/Drish973/CryptoJack-Guard/issues)

---

**Stay safe. Block cryptojacking. Use CryptoJack Guard.** 🛡️
