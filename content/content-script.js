// content/content-script.js

/**
 * Coordinates the cryptojacking detection modules.
 * Runs in the ISOLATED world.
 */
(function() {
  const isTopFrame = window === window.top;

  // Initialize the tab session with the background service worker
  if (isTopFrame) {
    chrome.runtime.sendMessage({
      type: 'INIT_TAB',
      url: window.location.href
    });
  }

  // Helper to send signals to the background worker
  function reportSignal(signal) {
    chrome.runtime.sendMessage({
      type: 'SIGNAL',
      signal: signal
    });
  }

  // 1. Signature Scanner (Scans static scripts and dynamic mutations)
  // Run on both top-frame and iframe scripts to catch mining scripts anywhere.
  if (typeof SignatureScanner !== 'undefined') {
    // Scan initial scripts already parsed in the DOM
    SignatureScanner.scanInitialScripts((match) => {
      reportSignal(match);
    });

    // Watch for new script elements injected dynamically
    SignatureScanner.startDynamicScanner((match) => {
      reportSignal(match);
    });
  }

  // 2. CPU Timing Loop (Macrotask delay monitoring)
  // Run ONLY on the top frame, as all frames share the same JS execution thread.
  if (isTopFrame && typeof CpuMonitor !== 'undefined') {
    CpuMonitor.startCpuMonitor((spikeSignal) => {
      reportSignal(spikeSignal);
    });
  }

  // 3. WebAssembly Event Bridge
  // Listen for custom events dispatched by the MAIN world wasm-interceptor.js
  document.addEventListener('CryptoJackWasmSignal', (event) => {
    if (event.detail) {
      reportSignal(event.detail);
    }
  });



})();
