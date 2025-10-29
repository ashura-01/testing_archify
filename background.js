import { U as Utils } from "./utils.js";
import "./localstorage.js";
const AUTO_ARCHIVE_ALARM_NAME = "autoArchiveTabsAlarm";
const TAB_ACTIVITY_STORAGE_KEY = "tabLastActivity";
chrome.sidePanel.setPanelBehavior({
  openPanelOnActionClick: true
}).catch((error) => console.error(error));
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.tabs.create({ url: "onboarding.html", active: true });
  }
  if (chrome.contextMenus) {
    chrome.contextMenus.create({
      id: "openArcify",
      title: "Arcify",
      contexts: ["all"]
    });
  }
});
if (chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    info.menuItemId === "openArcify" && chrome.sidePanel.open({
      windowId: tab.windowId
    });
  });
}
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.command === "toggleSpacePin") {
    chrome.runtime.sendMessage({ command: "toggleSpacePin", tabId: request.tabId });
  }
});
chrome.commands.onCommand.addListener(function(command) {
  if (command === "quickPinToggle") {
    console.log("sending");
    chrome.runtime.sendMessage({ command: "quickPinToggle" });
  }
});
async function updateTabLastActivity(tabId) {
  if (!tabId) return;
  try {
    const result = await chrome.storage.local.get(TAB_ACTIVITY_STORAGE_KEY);
    const activityData = result[TAB_ACTIVITY_STORAGE_KEY] || {};
    activityData[tabId] = Date.now();
    await chrome.storage.local.set({ [TAB_ACTIVITY_STORAGE_KEY]: activityData });
  } catch (error) {
    console.error("Error updating tab activity:", error);
  }
}
async function removeTabLastActivity(tabId) {
  if (!tabId) return;
  try {
    const result = await chrome.storage.local.get(TAB_ACTIVITY_STORAGE_KEY);
    const activityData = result[TAB_ACTIVITY_STORAGE_KEY] || {};
    delete activityData[tabId];
    await chrome.storage.local.set({ [TAB_ACTIVITY_STORAGE_KEY]: activityData });
  } catch (error) {
    console.error("Error removing tab activity:", error);
  }
}
async function setupAutoArchiveAlarm() {
  try {
    const settings = await Utils.getSettings();
    if (settings.autoArchiveEnabled && settings.autoArchiveIdleMinutes > 0) {
      const period = Math.max(1, settings.autoArchiveIdleMinutes / 2);
      await chrome.alarms.create(AUTO_ARCHIVE_ALARM_NAME, {
        periodInMinutes: period
      });
      console.log(`Auto-archive alarm set to run every ${period} minutes.`);
    } else {
      await chrome.alarms.clear(AUTO_ARCHIVE_ALARM_NAME);
      console.log("Auto-archive disabled, alarm cleared.");
    }
  } catch (error) {
    console.error("Error setting up auto-archive alarm:", error);
  }
}
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === AUTO_ARCHIVE_ALARM_NAME) {
    console.log("Auto-archive alarm triggered.");
    await runAutoArchiveCheck();
  }
});
async function runAutoArchiveCheck() {
  const settings = await Utils.getSettings();
  if (!settings.autoArchiveEnabled || settings.autoArchiveIdleMinutes <= 0) {
    console.log("Auto-archive check skipped (disabled or invalid time).");
    return;
  }
  const idleThresholdMillis = settings.autoArchiveIdleMinutes * 60 * 1e3;
  const now = Date.now();
  try {
    const activityResult = await chrome.storage.local.get(TAB_ACTIVITY_STORAGE_KEY);
    const tabActivity = activityResult[TAB_ACTIVITY_STORAGE_KEY] || {};
    const spacesResult = await chrome.storage.local.get("spaces");
    const spaces = spacesResult.spaces || [];
    const bookmarkedUrls = /* @__PURE__ */ new Set();
    spaces.forEach((space) => {
      if (space.spaceBookmarks) {
        space.spaceBookmarks.forEach((bookmark) => {
          if (typeof bookmark === "string") {
            bookmarkedUrls.add(bookmark);
          } else if (bookmark && bookmark.url) {
            bookmarkedUrls.add(bookmark.url);
          }
        });
      }
    });
    console.log("Bookmarked URLs for exclusion:", bookmarkedUrls);
    const tabs = await chrome.tabs.query({ pinned: false });
    const tabsToArchive = [];
    for (const tab of tabs) {
      if (tab.audible || tab.active) {
        await updateTabLastActivity(tab.id);
        continue;
      }
      if (bookmarkedUrls.has(tab.url)) {
        console.log(`Skipping archive for tab ${tab.id} - URL is bookmarked in a space.`);
        await updateTabLastActivity(tab.id);
        continue;
      }
      const lastActivity = tabActivity[tab.id];
      if (!lastActivity || now - lastActivity > idleThresholdMillis) {
        try {
          await chrome.tabs.get(tab.id);
          tabsToArchive.push(tab);
        } catch (e) {
          console.log(`Tab ${tab.id} closed before archiving, removing activity record.`);
          await removeTabLastActivity(tab.id);
        }
      }
    }
    console.log(`Found ${tabsToArchive.length} tabs eligible for auto-archiving.`);
    for (const tab of tabsToArchive) {
      console.log(`Auto-archiving tab: ${tab.id} - ${tab.title}`);
      const tabData = {
        url: tab.url,
        name: tab.title || tab.url,
        // Use URL if title is empty
        spaceId: tab.groupId
        // Archive within its current group/space
      };
      if (tabData.spaceId && tabData.spaceId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
        await Utils.addArchivedTab(tabData);
        await chrome.tabs.remove(tab.id);
        await removeTabLastActivity(tab.id);
      } else {
        console.log(`Skipping archive for tab ${tab.id} - not in a valid group.`);
      }
    }
  } catch (error) {
    console.error("Error during auto-archive check:", error);
  }
}
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed/updated. Setting up alarm.");
  setupAutoArchiveAlarm();
});
chrome.runtime.onStartup.addListener(() => {
  console.log("Chrome started. Setting up alarm.");
  setupAutoArchiveAlarm();
});
chrome.storage.onChanged.addListener((changes, areaName) => {
  const settingsChanged = ["autoArchiveEnabled", "autoArchiveIdleMinutes"].some((key) => key in changes);
  if ((areaName === "sync" || areaName === "local") && settingsChanged) {
    console.log("Auto-archive settings changed. Re-evaluating alarm setup.");
    setupAutoArchiveAlarm();
  }
});
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log(`Tab activated: ${activeInfo.tabId}`);
  await updateTabLastActivity(activeInfo.tabId);
});
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.audible !== void 0) {
    if (tab.active || tab.audible) {
      await updateTabLastActivity(tabId);
    }
  }
});
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  console.log(`Tab removed: ${tabId}`);
  await removeTabLastActivity(tabId);
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateAutoArchiveSettings") {
    console.log("Received message to update auto-archive settings.");
    setupAutoArchiveAlarm();
    sendResponse({ success: true });
  }
});
