// popup/popup.js

document.addEventListener('DOMContentLoaded', async () => {
  let activeTabId = null;
  let activeTabUrl = null;

  // DOM Elements
  const siteUrlEl = document.getElementById('site-url');
  const trustCheckbox = document.getElementById('trust-checkbox');
  const scoreNumberEl = document.getElementById('score-number');
  const scoreLabelEl = document.getElementById('score-label');
  const scoreDescEl = document.getElementById('score-desc');
  const gaugeFill = document.getElementById('gauge-fill');
  const signalsCountEl = document.getElementById('signals-count');
  const signalsListEl = document.getElementById('signals-list');
  const btnExport = document.getElementById('btn-export');
  const btnReset = document.getElementById('btn-reset');

  // Gauge Circumference (2 * PI * r; r = 50 => 314.16)
  const GAUGE_CIRCUMFERENCE = 314.16;

  // Fetch the active tab
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
    if (tabs && tabs[0]) {
      const activeTab = tabs[0];
      activeTabId = activeTab.id;
      activeTabUrl = activeTab.url;

      // Render hostname
      try {
        const urlObj = new URL(activeTabUrl);
        let hostname = urlObj.hostname;
        if (urlObj.protocol === 'file:') {
          hostname = 'Local File (' + urlObj.pathname.split('/').pop() + ')';
        } else if (!hostname) {
          hostname = activeTabUrl;
        }
        siteUrlEl.textContent = hostname;
        siteUrlEl.title = activeTabUrl;
      } catch (e) {
        siteUrlEl.textContent = activeTabUrl || 'Internal Page';
      }

      // Initialize UI from storage
      await refreshUI();
    } else {
      siteUrlEl.textContent = 'No active tab';
    }
  });

  /**
   * Refreshes the popup display using the active tab data
   */
  async function refreshUI() {
    if (!activeTabId) return;

    // 1. Get tab metrics and allowlist status
    const data = await StorageAPI.getTabData(activeTabId);
    const isAllowlisted = await StorageAPI.isAllowlisted(activeTabUrl);

    // 2. Set Allowlist Checkbox
    trustCheckbox.checked = isAllowlisted;

    // 3. Render score and gauge metrics
    let score = 0;
    let signals = [];

    if (data) {
      score = isAllowlisted ? 0 : data.score;
      signals = data.signals || [];
    }

    renderScoreGauge(score, isAllowlisted);

    // 4. Render signals logs
    renderSignalsLog(signals);
  }

  /**
   * Animates and renders the circular threat gauge
   * @param {number} score 
   * @param {boolean} isAllowlisted 
   */
  function renderScoreGauge(score, isAllowlisted) {
    // Write score text
    scoreNumberEl.textContent = score;

    // Animate progress ring
    const offset = GAUGE_CIRCUMFERENCE - (score / 100) * GAUGE_CIRCUMFERENCE;
    gaugeFill.style.strokeDashoffset = offset;

    // Reset indicator classes
    scoreLabelEl.className = 'label';
    scoreNumberEl.className = 'score';

    // UI States depending on danger thresholds
    if (isAllowlisted) {
      scoreLabelEl.textContent = 'Trusted';
      scoreLabelEl.classList.add('text-safe');
      scoreNumberEl.classList.add('text-safe');
      gaugeFill.style.stroke = 'var(--color-safe)';
      scoreDescEl.textContent = 'This site is marked as trusted. Cryptojacking checks are suppressed.';
    } else if (score >= 60) {
      scoreLabelEl.textContent = 'Danger';
      scoreLabelEl.classList.add('text-danger');
      scoreNumberEl.classList.add('text-danger');
      gaugeFill.style.stroke = 'var(--color-danger)';
      scoreDescEl.textContent = '⚠️ High risk! Active cryptominer script signatures or unauthorized WebAssembly operations detected.';
    } else if (score >= 30) {
      scoreLabelEl.textContent = 'Warning';
      scoreLabelEl.classList.add('text-warn');
      scoreNumberEl.classList.add('text-warn');
      gaugeFill.style.stroke = 'var(--color-warn)';
      scoreDescEl.textContent = 'Suspicious activity found: event loop slowdowns or generic WebAssembly executions detected.';
    } else {
      scoreLabelEl.textContent = 'Safe';
      scoreLabelEl.classList.add('text-safe');
      scoreNumberEl.classList.add('text-safe');
      gaugeFill.style.stroke = 'var(--color-safe)';
      scoreDescEl.textContent = 'No cryptomining signatures or abnormal CPU usage detected on this page.';
    }
  }

  /**
   * Populates the list of threat signals with SVGs and descriptions
   * @param {Array} signals 
   */
  function renderSignalsLog(signals) {
    signalsCountEl.textContent = signals.length;

    if (signals.length === 0) {
      signalsListEl.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <p>Clean Event Stream</p>
        </div>
      `;
      return;
    }

    // Sort signals descending by timestamp
    const sorted = [...signals].sort((a, b) => b.ts - a.ts);

    signalsListEl.innerHTML = sorted.map(sig => {
      let icon = '';
      let title = '';
      let details = '';
      let classType = '';

      const timeStr = new Date(sig.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (sig.type === 'signature') {
        classType = 'sig-signature';
        title = 'Signature Match';
        icon = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
        details = `Matched: "${sig.pattern}"`;
      } else if (sig.type === 'wasm') {
        classType = 'sig-wasm';
        title = 'Suspicious WASM';
        icon = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="15" x2="23" y2="15"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="15" x2="4" y2="15"></line></svg>`;
        
        if (sig.matchedKeyword) {
          details = `Binary contains keyword: "${sig.matchedKeyword}"`;
        } else {
          details = `Imports env.memory / env.table. Hex: ${sig.headerHex.substring(0, 16)}...`;
        }
      } else if (sig.type === 'cpu') {
        classType = 'sig-cpu';
        title = 'CPU Thread Spike';
        icon = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
        details = `Main thread lag: ${sig.delayMs}ms (spike #${sig.spikeCount})`;
      }

      const sourceDisplay = sig.source ? sig.source : 'WebAssembly binary';

      return `
        <div class="signal-item ${classType}">
          <div class="sig-icon-wrapper">
            ${icon}
          </div>
          <div class="sig-info">
            <div class="sig-title-row">
              <span class="sig-type">${title}</span>
              <span class="sig-time">${timeStr}</span>
            </div>
            <span class="sig-source" title="${sourceDisplay}">${sourceDisplay}</span>
            <span class="sig-details" title="${details}">${details}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // BINDING TOGGLE SWITCH
  trustCheckbox.addEventListener('change', async (event) => {
    if (!activeTabUrl) return;

    try {
      const urlObj = new URL(activeTabUrl);
      const hostname = urlObj.hostname || 'local-file';
      
      if (event.target.checked) {
        // Add to allowlist
        await StorageAPI.addAllowlist(hostname);
      } else {
        // Remove from allowlist
        await StorageAPI.removeAllowlist(hostname);
      }

      // Update current tab status in local storage
      const data = await StorageAPI.getTabData(activeTabId);
      if (data) {
        data.isTrusted = event.target.checked;
        if (data.isTrusted) {
          data.score = 0;
        } else {
          // Recalculate score from signal history
          // Simple recalculate helper
          const SCORE_WEIGHTS = { signature: 100, wasm: 60, cpu: 30 };
          let tempScore = 0;
          
          // Re-evaluate weights on logged unique signals
          const seen = new Set();
          for (const s of data.signals) {
            const sigKey = `${s.type}_${s.source || ''}`;
            if (!seen.has(sigKey) || s.type === 'cpu') {
              seen.add(sigKey);
              tempScore += (SCORE_WEIGHTS[s.type] || 0);
            }
          }
          data.score = Math.min(100, tempScore);
        }
        await StorageAPI.setTabData(activeTabId, data);
        
        // Notify service worker to update badge immediately
        chrome.runtime.sendMessage({
          type: 'SIGNAL',
          signal: { type: 'allowlist_toggle_update_badge' } // just a tickle to re-evaluate
        });
      }

      // Refresh UI values
      await refreshUI();

    } catch (e) {
      console.error('[CryptoJack Guard] Allowlist update failed:', e);
    }
  });

  // BINDING EXPORT BUTTON
  btnExport.addEventListener('click', async () => {
    if (!activeTabId) return;

    const data = await StorageAPI.getTabData(activeTabId);
    if (!data || !data.signals || data.signals.length === 0) {
      alert('No threat signals logged for this tab yet.');
      return;
    }

    try {
      const urlObj = new URL(activeTabUrl);
      const hostname = urlObj.hostname || 'local-file';
      const exportData = {
        extension: "CryptoJack Guard",
        version: "1.0.0",
        tabUrl: activeTabUrl,
        scanTime: new Date().toISOString(),
        threatScore: data.score,
        isTrusted: data.isTrusted,
        totalSignals: data.signals.length,
        signals: data.signals
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${hostname}_threat_log.json`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  });

  // BINDING CLEAR BUTTON
  btnReset.addEventListener('click', async () => {
    if (!activeTabId) return;
    
    if (confirm('Are you sure you want to clear threat telemetry for this tab?')) {
      await StorageAPI.clearTabData(activeTabId);
      
      // Clear badge
      chrome.action.setBadgeText({ text: '', tabId: activeTabId });
      
      // Re-initialize
      chrome.runtime.sendMessage({
        type: 'INIT_TAB',
        url: activeTabUrl
      });

      // Simple delay to let service worker update
      setTimeout(async () => {
        await refreshUI();
      }, 100);
    }
  });

});
