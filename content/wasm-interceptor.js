// content/wasm-interceptor.js

(function() {
  // Prevent double injection
  if (window.CryptoJackWasmIntercepted) return;
  window.CryptoJackWasmIntercepted = true;

  const SUSPICIOUS_KEYWORDS = [
    'cryptonight',
    'stratum+tcp',
    'mining.submit',
    'getwork',
    'cn-slow',
    'cn-heavy',
    'rx/0',
    'cn/r'
  ];

  /**
   * Analyzes a WebAssembly binary buffer and its import object
   * @param {ArrayBuffer|TypedArray} bufferSource 
   * @param {Object} importObject 
   */
  function inspectWasm(bufferSource, importObject) {
    try {
      if (!bufferSource) return;

      // Ensure we have a Uint8Array view of the buffer
      let bytes;
      if (bufferSource instanceof ArrayBuffer) {
        bytes = new Uint8Array(bufferSource);
      } else if (ArrayBuffer.isView(bufferSource)) {
        bytes = new Uint8Array(bufferSource.buffer, bufferSource.byteOffset, bufferSource.byteLength);
      } else {
        return;
      }

      // 1. Get hex header (first 32 bytes)
      const headerHex = Array.from(bytes.slice(0, 32))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // 2. Format import keys for inspection
      let importKeys = '';
      if (importObject) {
        importKeys = Object.keys(importObject)
          .flatMap(k => {
            const val = importObject[k];
            if (val && typeof val === 'object') {
              return [k, ...Object.keys(val).map(sub => `${k}.${sub}`)];
            }
            return [k];
          })
          .join(' ')
          .toLowerCase();
      }

      // 3. Scan the first 128KB of binary for known miner strings
      // (This covers the string literals section of the WebAssembly data segment in almost all miners)
      let matchedKeyword = null;
      try {
        const scanLength = Math.min(bytes.length, 128 * 1024);
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const textSnippet = decoder.decode(bytes.subarray(0, scanLength));
        
        for (const keyword of SUSPICIOUS_KEYWORDS) {
          if (textSnippet.toLowerCase().includes(keyword)) {
            matchedKeyword = keyword;
            break;
          }
        }
      } catch (decodeErr) {
        // Fallback or ignore decoding issues
      }

      // 4. Classify suspicion level
      // WebAssembly miners generally request shared memory/env bindings (like env.memory or env.abort)
      const hasEnvMemory = importKeys.includes('memory') || importKeys.includes('env');
      const isSuspicious = !!matchedKeyword || (hasEnvMemory && importKeys.includes('table'));

      if (isSuspicious || matchedKeyword) {
        // Dispatch custom event to cross the bridge into the ISOLATED world content script
        const signal = {
          type: 'wasm',
          importKeys,
          headerHex,
          matchedKeyword,
          isSuspicious,
          timestamp: Date.now()
        };

        const event = new CustomEvent('CryptoJackWasmSignal', { 
          detail: signal
        });
        document.dispatchEvent(event);
      }
    } catch (e) {
      console.error('[CryptoJack Guard] Wasm inspection failed:', e);
    }
  }

  // --- MONKEY PATCHING WASM ENTRYPOINTS ---

  // 1. Intercept WebAssembly.instantiate
  const originalInstantiate = WebAssembly.instantiate;
  WebAssembly.instantiate = async function(bufferSource, importObject) {
    if (bufferSource instanceof WebAssembly.Module) {
      // If instantiate is called with a pre-compiled Module
      inspectWasm(null, importObject);
    } else {
      inspectWasm(bufferSource, importObject);
    }
    return originalInstantiate.apply(this, arguments);
  };

  // 2. Intercept WebAssembly.instantiateStreaming
  if (WebAssembly.instantiateStreaming) {
    const originalInstantiateStreaming = WebAssembly.instantiateStreaming;
    WebAssembly.instantiateStreaming = async function(source, importObject) {
      try {
        let response = source;
        if (source instanceof Promise) {
          response = await source;
        }
        if (response instanceof Response) {
          // Clone the response to read bytes without consuming the original stream
          const responseClone = response.clone();
          responseClone.arrayBuffer().then(buffer => {
            inspectWasm(buffer, importObject);
          }).catch(e => {
            console.error('[CryptoJack Guard] Failed to read streaming response buffer:', e);
          });
        }
      } catch (err) {
        console.error('[CryptoJack Guard] Error in instantiateStreaming interceptor:', err);
      }
      return originalInstantiateStreaming.apply(this, arguments);
    };
  }

  // 3. Intercept WebAssembly.compile
  const originalCompile = WebAssembly.compile;
  WebAssembly.compile = async function(bufferSource) {
    inspectWasm(bufferSource, null);
    return originalCompile.apply(this, arguments);
  };

  // 4. Intercept WebAssembly.compileStreaming
  if (WebAssembly.compileStreaming) {
    const originalCompileStreaming = WebAssembly.compileStreaming;
    WebAssembly.compileStreaming = async function(source) {
      try {
        let response = source;
        if (source instanceof Promise) {
          response = await source;
        }
        if (response instanceof Response) {
          const responseClone = response.clone();
          responseClone.arrayBuffer().then(buffer => {
            inspectWasm(buffer, null);
          }).catch(e => {
            console.error('[CryptoJack Guard] Failed to read compile streaming response buffer:', e);
          });
        }
      } catch (err) {
        console.error('[CryptoJack Guard] Error in compileStreaming interceptor:', err);
      }
      return originalCompileStreaming.apply(this, arguments);
    };
  }

  // 5. Intercept WebAssembly.Module constructor
  const originalModule = WebAssembly.Module;
  const newModuleConstructor = function(bytes) {
    inspectWasm(bytes, null);
    // Use Reflect.construct to properly instantiate the native object
    return Reflect.construct(originalModule, arguments, newModuleConstructor);
  };
  newModuleConstructor.prototype = originalModule.prototype;
  WebAssembly.Module = newModuleConstructor;

})();
