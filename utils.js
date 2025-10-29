import { L as LocalStorage } from "./localstorage.js";
const MAX_ARCHIVED_TABS = 100;
const ARCHIVED_TABS_KEY = "archivedTabs";
const Utils = {
  processBookmarkFolder: async function(folder, groupId) {
    const bookmarks = [];
    const items = await chrome.bookmarks.getChildren(folder.id);
    const tabs = await chrome.tabs.query({ groupId });
    for (const item of items) {
      if (item.url) {
        const tab = tabs.find((t) => t.url === item.url);
        if (tab) {
          bookmarks.push(tab.id);
          if (item.title && item.title !== tab.title) {
            await this.setTabNameOverride(tab.id, tab.url, item.title);
            console.log(`Override set for tab ${tab.id} from bookmark: ${item.title}`);
          }
        }
      } else {
        const subFolderBookmarks = await this.processBookmarkFolder(item, groupId);
        bookmarks.push(...subFolderBookmarks);
      }
    }
    return bookmarks;
  },
  // Helper function to generate UUID (If you want to move this too)
  generateUUID: function() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  },
  // Helper function to fetch favicon
  getFaviconUrl: function(u, size = "16") {
    const url = new URL(chrome.runtime.getURL("/_favicon/"));
    url.searchParams.set("pageUrl", u);
    url.searchParams.set("size", size);
    return url.toString();
  },
  getSettings: async function() {
    const defaultSettings = {
      defaultSpaceName: "Home",
      autoArchiveEnabled: false,
      // Default: disabled
      autoArchiveIdleMinutes: 30
      // Default: 30 minutes
      // ... other settings ...
    };
    const result = await chrome.storage.sync.get(defaultSettings);
    console.log("Retrieved settings:", result);
    return result;
  },
  // Get all overrides (keyed by tabId)
  getTabNameOverrides: async function() {
    const result = await chrome.storage.local.get("tabNameOverridesById");
    return result.tabNameOverridesById || {};
  },
  // Save all overrides (keyed by tabId)
  saveTabNameOverrides: async function(overrides) {
    await chrome.storage.local.set({ tabNameOverridesById: overrides });
  },
  // Set or update a single override using tabId
  setTabNameOverride: async function(tabId, url, name) {
    if (!tabId || !url || !name) return;
    const overrides = await this.getTabNameOverrides();
    try {
      const originalDomain = new URL(url).hostname;
      overrides[tabId] = { name, originalDomain };
      await this.saveTabNameOverrides(overrides);
      console.log(`Override set for tab ${tabId}: ${name}`);
    } catch (e) {
      console.error("Error setting override - invalid URL?", url, e);
    }
  },
  // Remove an override using tabId
  removeTabNameOverride: async function(tabId) {
    if (!tabId) return;
    const overrides = await this.getTabNameOverrides();
    if (overrides[tabId]) {
      delete overrides[tabId];
      await this.saveTabNameOverrides(overrides);
      console.log(`Override removed for tab ${tabId}`);
    }
  },
  getTabGroupColor: async function(groupName) {
    let tabGroups = await chrome.tabGroups.query({});
    const chromeTabGroupColors = [
      "grey",
      "blue",
      "red",
      "yellow",
      "green",
      "pink",
      "purple",
      "cyan"
    ];
    const existingGroup = tabGroups.find((group) => group.title === groupName);
    if (existingGroup) {
      return existingGroup.color;
    } else {
      const randomIndex = Math.floor(Math.random() * chromeTabGroupColors.length);
      return chromeTabGroupColors[randomIndex];
    }
  },
  updateBookmarkTitleIfNeeded: async function(tab, activeSpace, newTitle) {
    console.log(`Attempting to update bookmark for pinned tab ${tab.id} in space ${activeSpace.name} to title: ${newTitle}`);
    try {
      const spaceFolder = await LocalStorage.getOrCreateSpaceFolder(activeSpace.name);
      if (!spaceFolder) {
        console.error(`Bookmark folder for space ${activeSpace.name} not found.`);
        return;
      }
      const findAndUpdate = async (folderId) => {
        const items = await chrome.bookmarks.getChildren(folderId);
        for (const item of items) {
          if (item.url && item.url === tab.url) {
            if (item.title !== newTitle) {
              console.log(`Found bookmark ${item.id} for URL ${tab.url}. Updating title to "${newTitle}"`);
              await chrome.bookmarks.update(item.id, { title: newTitle });
            } else {
              console.log(`Bookmark ${item.id} title already matches "${newTitle}". Skipping update.`);
            }
            return true;
          } else if (!item.url) {
            const found = await findAndUpdate(item.id);
            if (found) return true;
          }
        }
        return false;
      };
      const updated = await findAndUpdate(spaceFolder.id);
      if (!updated) {
        console.log(`Bookmark for URL ${tab.url} not found in space folder ${activeSpace.name}.`);
      }
    } catch (error) {
      console.error(`Error updating bookmark for tab ${tab.id}:`, error);
    }
  },
  // Function to get if archiving is enabled
  isArchivingEnabled: async function() {
    const settings = await this.getSettings();
    return settings.autoArchiveEnabled;
  },
  // Get all archived tabs
  getArchivedTabs: async function() {
    const result = await chrome.storage.local.get(ARCHIVED_TABS_KEY);
    return result[ARCHIVED_TABS_KEY] || [];
  },
  // Save all archived tabs
  saveArchivedTabs: async function(tabs) {
    await chrome.storage.local.set({ [ARCHIVED_TABS_KEY]: tabs });
  },
  // Add a tab to the archive
  addArchivedTab: async function(tabData) {
    if (!tabData || !tabData.url || !tabData.name || !tabData.spaceId) return;
    const archivedTabs = await this.getArchivedTabs();
    const exists = archivedTabs.some((t) => t.url === tabData.url && t.spaceId === tabData.spaceId);
    if (exists) {
      console.log(`Tab already archived: ${tabData.name}`);
      return;
    }
    const newArchiveEntry = { ...tabData, archivedAt: Date.now() };
    archivedTabs.push(newArchiveEntry);
    archivedTabs.sort((a, b) => b.archivedAt - a.archivedAt);
    if (archivedTabs.length > MAX_ARCHIVED_TABS) {
      archivedTabs.splice(MAX_ARCHIVED_TABS);
    }
    await this.saveArchivedTabs(archivedTabs);
    console.log(`Archived tab: ${tabData.name} from space ${tabData.spaceId}`);
  },
  // Function to archive a tab (likely called from context menu)
  archiveTab: async function(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab || !activeSpaceId) return;
      const tabData = {
        url: tab.url,
        name: tab.title,
        spaceId: activeSpaceId
        // Archive within the current space
      };
      await this.addArchivedTab(tabData);
      await chrome.tabs.remove(tabId);
    } catch (error) {
      console.error(`Error archiving tab ${tabId}:`, error);
    }
  },
  // Remove a tab from the archive (e.g., after restoration)
  removeArchivedTab: async function(url, spaceId) {
    if (!url || !spaceId) return;
    let archivedTabs = await this.getArchivedTabs();
    archivedTabs = archivedTabs.filter((tab) => !(tab.url === url && tab.spaceId === spaceId));
    await this.saveArchivedTabs(archivedTabs);
    console.log(`Removed archived tab: ${url} from space ${spaceId}`);
  },
  restoreArchivedTab: async function(archivedTabData) {
    try {
      const newTab = await chrome.tabs.create({
        url: archivedTabData.url,
        active: true
        // Make it active
        // windowId: currentWindow.id // Ensure it's in the current window
      });
      await chrome.tabs.group({ tabIds: [newTab.id] });
      await this.removeArchivedTab(archivedTabData.url, archivedTabData.spaceId);
    } catch (error) {
      console.error(`Error restoring archived tab ${archivedTabData.url}:`, error);
    }
  },
  setArchivingEnabled: async function(enabled) {
    const settings = await this.getSettings();
    settings.autoArchiveEnabled = enabled;
    await chrome.storage.sync.set({ autoArchiveEnabled: enabled });
  },
  setArchiveTime: async function(minutes) {
    const settings = await this.getSettings();
    settings.autoArchiveIdleMinutes = minutes;
    await chrome.storage.sync.set({ autoArchiveIdleMinutes: minutes });
  },
  // Search and remove bookmark by URL from a folder structure recursively
  searchAndRemoveBookmark: async function(folderId, tabUrl, options = {}) {
    const {
      removeTabElement = false,
      // Whether to also remove the tab element from DOM
      tabElement = null,
      // The tab element to remove if removeTabElement is true
      logRemoval = false
      // Whether to log the removal
    } = options;
    const items = await chrome.bookmarks.getChildren(folderId);
    for (const item of items) {
      if (item.url === tabUrl) {
        if (logRemoval) {
          console.log("removing bookmark", item);
        }
        await chrome.bookmarks.remove(item.id);
        if (removeTabElement && tabElement) {
          tabElement.remove();
        }
        return true;
      } else if (!item.url) {
        const found = await this.searchAndRemoveBookmark(item.id, tabUrl, options);
        if (found) return true;
      }
    }
    return false;
  }
};
export {
  Utils as U
};
