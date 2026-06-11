// content/signature-scanner.js

/**
 * Scans page scripts for known cryptomining patterns.
 * Designed to run in the ISOLATED content script world.
 */
var SignatureScanner = (function() {
  
  // Track already scanned elements to avoid double reporting
  const scannedScripts = new WeakSet();

  /**
   * Evaluates a single script element
   * @param {HTMLScriptElement} script 
   * @returns {Object|null} Match details or null if safe
   */
  function checkScriptNode(script) {
    if (scannedScripts.has(script)) return null;
    scannedScripts.add(script);

    // 1. Check external script src signature
    if (script.src) {
      const src = script.src.toLowerCase();
      // KNOWN_MINER_URLS is declared in shared/signatures.js
      const match = KNOWN_MINER_URLS.find(url => src.includes(url.toLowerCase()));
      if (match) {
        return {
          detected: true,
          type: 'signature',
          source: script.src,
          pattern: match,
          isInline: false
        };
      }
    } else {
      // 2. Check inline script content signature
      const content = (script.textContent || '').toLowerCase();
      if (content.trim()) {
        const match = KNOWN_MINER_WASM_STRINGS.find(pattern => content.includes(pattern.toLowerCase()));
        if (match) {
          // Provide a small code snippet for context in popup log (first 120 chars)
          const snippet = script.textContent.trim().substring(0, 120) + '...';
          return {
            detected: true,
            type: 'signature',
            source: `Inline Script: "${snippet}"`,
            pattern: match,
            isInline: true
          };
        }
      }
    }
    return null;
  }

  return {
    /**
     * Performs an initial scan of all scripts in the DOM
     * @param {Function} onMatch callback when signature is found
     */
    scanInitialScripts(onMatch) {
      try {
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const result = checkScriptNode(script);
          if (result) {
            onMatch(result);
          }
        }
      } catch (err) {
        console.error('[CryptoJack Guard] Initial script scan failed:', err);
      }
    },

    /**
     * Monitors the DOM for dynamically injected script tags
     * @param {Function} onMatch callback when signature is found
     * @returns {MutationObserver} observer instance
     */
    startDynamicScanner(onMatch) {
      try {
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node.nodeName === 'SCRIPT') {
                const result = checkScriptNode(node);
                if (result) onMatch(result);
              } else if (node.querySelectorAll) {
                // If a container element containing script tags is added
                const nestedScripts = node.querySelectorAll('script');
                for (const script of nestedScripts) {
                  const result = checkScriptNode(script);
                  if (result) onMatch(result);
                }
              }
            }
          }
        });

        // Start observing document structure changes
        observer.observe(document.documentElement || document, {
          childList: true,
          subtree: true
        });

        return observer;
      } catch (err) {
        console.error('[CryptoJack Guard] Failed to start dynamic script scanner:', err);
        return null;
      }
    }
  };
})();
