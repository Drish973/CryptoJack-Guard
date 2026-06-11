// shared/storage-api.js

var StorageAPI = {
  /**
   * Retrieves stored data for a specific tab
   * @param {number} tabId 
   * @returns {Promise<Object|null>}
   */
  async getTabData(tabId) {
    const key = `tab_${tabId}`;
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null);
      });
    });
  },

  /**
   * Sets data for a specific tab
   * @param {number} tabId 
   * @param {Object} data 
   * @returns {Promise<void>}
   */
  async setTabData(tabId, data) {
    const key = `tab_${tabId}`;
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: data }, () => {
        resolve();
      });
    });
  },

  /**
   * Deletes data for a specific tab
   * @param {number} tabId 
   * @returns {Promise<void>}
   */
  async clearTabData(tabId) {
    const key = `tab_${tabId}`;
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => {
        resolve();
      });
    });
  },

  /**
   * Gets the list of trusted hostnames
   * @returns {Promise<string[]>}
   */
  async getAllowlist() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['allowlist'], (result) => {
        resolve(result.allowlist || []);
      });
    });
  },

  /**
   * Adds a hostname to the trusted list
   * @param {string} hostname 
   * @returns {Promise<string[]>}
   */
  async addAllowlist(hostname) {
    const list = await this.getAllowlist();
    if (!list.includes(hostname)) {
      list.push(hostname);
      return new Promise((resolve) => {
        chrome.storage.sync.set({ allowlist: list }, () => {
          resolve(list);
        });
      });
    }
    return list;
  },

  /**
   * Removes a hostname from the trusted list
   * @param {string} hostname 
   * @returns {Promise<string[]>}
   */
  async removeAllowlist(hostname) {
    let list = await this.getAllowlist();
    list = list.filter(h => h !== hostname);
    return new Promise((resolve) => {
      chrome.storage.sync.set({ allowlist: list }, () => {
        resolve(list);
      });
    });
  },

  /**
   * Checks if a URL's hostname is in the trusted allowlist
   * @param {string} urlStr 
   * @returns {Promise<boolean>}
   */
  async isAllowlisted(urlStr) {
    try {
      if (!urlStr) return false;
      const hostname = new URL(urlStr).hostname;
      const list = await this.getAllowlist();
      return list.includes(hostname);
    } catch (e) {
      return false;
    }
  }
};
