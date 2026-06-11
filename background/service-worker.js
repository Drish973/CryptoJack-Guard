// background/service-worker.js

// Import dependencies using standard Web Worker importScripts
importScripts('../shared/signatures.js', '../shared/storage-api.js');

const SCORE_WEIGHTS = {
  signature: 100, // signature match = definite threat
  wasm: 60,       // suspicious wasm imports/keywords = likely threat
  cpu: 30,        // cpu event loop lag = possible threat
};

const ALERT_THRESHOLD = 60;

// Listen for messages from content scripts and popup UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : null;
  const url = sender.tab ? sender.tab.url : null;

  if (message.type === 'INIT_TAB' && tabId) {
    initializeTab(tabId, url);
  } else if (message.type === 'SIGNAL' && tabId) {
    processSignal(tabId, url, message.signal);
  }
  
  // Return true if async response is needed (none needed here)
  return false;
});

// Clean up tab records when they are closed to prevent storage leak
chrome.tabs.onRemoved.addListener((tabId) => {
  StorageAPI.clearTabData(tabId);
});

/**
 * Initializes/resets a tab's cryptojacking record in storage
 * @param {number} tabId 
 * @param {string} url 
 */
async function initializeTab(tabId, url) {
  try {
    // Reset badges and scores on a new page load
    chrome.action.setBadgeText({ text: '', tabId });
    
    const isTrusted = await StorageAPI.isAllowlisted(url);

    const initialData = {
      score: 0,
      signals: [],
      url: url,
      alertTriggered: false,
      isTrusted: isTrusted,
      lastUpdated: Date.now()
    };

    await StorageAPI.setTabData(tabId, initialData);
    console.log(`[CryptoJack Guard] Initialized tab ${tabId} for ${url} (Trusted: ${isTrusted})`);
  } catch (err) {
    console.error('[CryptoJack Guard] Failed to initialize tab record:', err);
  }
}

/**
 * Evaluates incoming signals and updates the threat score
 * @param {number} tabId 
 * @param {string} url 
 * @param {Object} signal 
 */
async function processSignal(tabId, url, signal) {
  try {
    // Fetch existing records or create defaults
    let data = await StorageAPI.getTabData(tabId);
    if (!data) {
      data = { score: 0, signals: [], url: url, alertTriggered: false, isTrusted: false };
    }

    // Update URL if changed (e.g. hash navigations or SPA updates)
    data.url = url || data.url;

    // Check allowlist status dynamically
    const isTrusted = await StorageAPI.isAllowlisted(data.url);
    data.isTrusted = isTrusted;

    // Prevent duplicate signals of the exact same type and source
    const isDuplicate = data.signals.some(s => s.type === signal.type && s.source === signal.source);
    if (isDuplicate && signal.type !== 'cpu') {
      // Allow CPU spikes to log multiple times, but block signature/wasm duplication
      return;
    }

    // Add signal to log
    data.signals.push({
      ...signal,
      ts: Date.now()
    });

    // Compute threat score (ignored or kept at 0 if site is allowlisted/trusted)
    if (!isTrusted) {
      const weight = SCORE_WEIGHTS[signal.type] || 0;
      data.score = Math.min(100, data.score + weight);
    } else {
      data.score = 0;
    }

    data.lastUpdated = Date.now();
    await StorageAPI.setTabData(tabId, data);

    console.log(`[CryptoJack Guard] Tab ${tabId} Signal:`, signal, `New Score: ${data.score}`);

    // Update Extension Badge
    updateBadge(tabId, data);

    // Trigger Notification if score hits threshold and notification hasn't fired yet
    if (data.score >= ALERT_THRESHOLD && !data.alertTriggered && !isTrusted) {
      data.alertTriggered = true;
      await StorageAPI.setTabData(tabId, data);
      triggerDesktopNotification(tabId, data);
    }
  } catch (err) {
    console.error('[CryptoJack Guard] Error processing threat signal:', err);
  }
}

/**
 * Updates the browser badge overlay
 * @param {number} tabId 
 * @param {Object} data 
 */
function updateBadge(tabId, data) {
  try {
    if (data.isTrusted) {
      chrome.action.setBadgeText({ text: 'Trusted', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#10B981', tabId }); // Green for Trusted
    } else if (data.score > 0) {
      chrome.action.setBadgeText({ text: data.score.toString(), tabId });
      
      // Dynamic colors based on score levels
      let badgeColor = '#10B981'; // Green (Safe)
      if (data.score >= ALERT_THRESHOLD) {
        badgeColor = '#EF4444'; // Red (Danger)
      } else if (data.score >= 30) {
        badgeColor = '#F59E0B'; // Amber (Suspicious)
      }
      
      chrome.action.setBadgeBackgroundColor({ color: badgeColor, tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  } catch (e) {
    // Tab might be closed or invalid
  }
}

/**
 * Triggers a native chrome desktop alert
 * @param {number} tabId 
 * @param {Object} data 
 */
function triggerDesktopNotification(tabId, data) {
  try {
    const hostname = new URL(data.url).hostname;
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon48.png',
      title: '⚠️ Cryptojacking Detected!',
      message: `Suspicious activities found on "${hostname}". Score: ${data.score}/100. Script blocked or monitored.`,
      priority: 2
    });
  } catch (err) {
    console.error('[CryptoJack Guard] Failed to fire notification:', err);
  }
}
