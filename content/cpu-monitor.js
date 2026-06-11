// content/cpu-monitor.js

/**
 * Heuristically monitors CPU usage in the browser tab.
 * Uses event-loop scheduling delays of macrotasks (setTimeout) to check if the main thread is blocked.
 * Designed to run in the ISOLATED content script world.
 */
var CpuMonitor = (function() {
  const SAMPLE_INTERVAL_MS = 2000;
  const SPIKE_THRESHOLD_MS = 60;   // Macrotask lag threshold in ms (clamped expected delay is ~4ms)
  const SPIKE_COUNT_TRIGGER = 3;   // Consecutive busy events before triggering threat signal

  let spikeCount = 0;
  let timerId = null;

  return {
    /**
     * Starts the CPU timing loop
     * @param {Function} onSpike callback when sustained event loop lag is detected
     */
    startCpuMonitor(onSpike) {
      if (timerId) return;

      timerId = setInterval(() => {
        // Skip monitoring if the tab is in the background (hidden)
        // Browsers automatically throttle execution for hidden tabs, causing false positives.
        if (document.hidden) {
          spikeCount = 0;
          return;
        }

        const start = performance.now();

        // Schedule a macrotask on the event loop
        setTimeout(() => {
          // Calculate the lag beyond the browser's scheduling overhead (typically ~0-4ms)
          const elapsed = performance.now() - start;
          const delay = Math.max(0, elapsed - 4); // subtracting typical 4ms clamp

          if (delay > SPIKE_THRESHOLD_MS) {
            spikeCount++;
            
            if (spikeCount >= SPIKE_COUNT_TRIGGER) {
              onSpike({
                type: 'cpu',
                delayMs: Math.round(delay),
                spikeCount,
                timestamp: Date.now()
              });
              // Reset spike count after reporting
              spikeCount = 0;
            }
          } else {
            // Decay model: slow decay of suspicious spikes when performance recovers
            spikeCount = Math.max(0, spikeCount - 1);
          }
        }, 0);
      }, SAMPLE_INTERVAL_MS);
    },

    /**
     * Stops the CPU monitor
     */
    stopCpuMonitor() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      spikeCount = 0;
    }
  };
})();
