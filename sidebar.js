import { C as ChromeHelper } from "./chromeHelper.js";
import { R as RESTORE_ICON, F as FOLDER_CLOSED_ICON, a as FOLDER_OPEN_ICON } from "./icons.js";
import { L as LocalStorage } from "./localstorage.js";
import { U as Utils } from "./utils.js";
document.getElementById("spacesList");
const spaceSwitcher$1 = document.getElementById("spaceSwitcher");
const addSpaceBtn = document.getElementById("addSpaceBtn");
const newTabBtn = document.getElementById("newTabBtn");
document.getElementById("spaceTemplate");
function setupDOMElements(createNewSpace2, createNewTab2) {
  spaceSwitcher$1.addEventListener("wheel", (event) => {
    event.preventDefault();
    const scrollAmount = event.deltaY;
    spaceSwitcher$1.scrollLeft += scrollAmount;
  }, { passive: false });
  addSpaceBtn.addEventListener("click", () => {
    const inputContainer = document.getElementById("addSpaceInputContainer");
    const spaceNameInput = document.getElementById("newSpaceName");
    const isInputVisible = inputContainer.classList.contains("visible");
    inputContainer.classList.toggle("visible");
    addSpaceBtn.classList.toggle("active");
    if (isInputVisible) {
      spaceSwitcher$1.style.opacity = "1";
      spaceSwitcher$1.style.visibility = "visible";
    } else {
      spaceNameInput.value = "";
      spaceSwitcher$1.style.opacity = "0";
      spaceSwitcher$1.style.visibility = "hidden";
    }
  });
  document.getElementById("createSpaceBtn").addEventListener("click", createNewSpace2);
  newTabBtn.addEventListener("click", createNewTab2);
  const createSpaceColorSwatch = document.getElementById("createSpaceColorSwatch");
  createSpaceColorSwatch.addEventListener("click", (e) => {
    if (e.target.classList.contains("color-swatch")) {
      const colorPicker = document.getElementById("createSpaceColorSwatch");
      const select = document.getElementById("spaceColor");
      const color = e.target.dataset.color;
      colorPicker.querySelectorAll(".color-swatch").forEach((swatch) => {
        swatch.classList.remove("selected");
      });
      e.target.classList.add("selected");
      select.value = color;
      const event = new Event("change");
      select.dispatchEvent(event);
    }
  });
  document.querySelectorAll(".space-color-select").forEach((select) => {
    const colorPicker = select.nextElementSibling;
    const currentColor = select.value;
    const swatch = colorPicker.querySelector(`[data-color="${currentColor}"]`);
    if (swatch) {
      swatch.classList.add("selected");
    }
  });
  document.getElementById("newSpaceName").addEventListener("input", (e) => {
    const createSpaceBtn = document.getElementById("createSpaceBtn");
    createSpaceBtn.disabled = !e.target.value.trim();
  });
}
function activateTabInDOM(tabId) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".pinned-favicon").forEach((f) => f.classList.remove("active"));
  const targetTab = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (targetTab) {
    targetTab.classList.add("active");
  }
}
function activateSpaceInDOM(spaceId, spaces2, updateSpaceSwitcher2) {
  document.querySelectorAll(".space").forEach((s) => {
    const isActive = s.dataset.spaceId === String(spaceId);
    s.classList.toggle("active", isActive);
    s.style.display = isActive ? "block" : "none";
  });
  const space = spaces2.find((s) => s.id === spaceId);
  if (space) {
    const sidebarContainer = document.getElementById("sidebar-container");
    sidebarContainer.style.setProperty("--space-bg-color", `var(--chrome-${space.color}-color, rgba(255, 255, 255, 0.1))`);
    sidebarContainer.style.setProperty("--space-bg-color-dark", `var(--chrome-${space.color}-color-dark, rgba(255, 255, 255, 0.1))`);
  }
  updateSpaceSwitcher2();
}
function showTabContextMenu(x, y, tab, isPinned, isBookmarkOnly, tabElement, closeTab2, spaces2, moveTabToSpace2, setActiveSpace2, allBookmarkSpaceFolders, createSpaceFromInactive2) {
  const existingMenu = document.getElementById("tab-context-menu");
  if (existingMenu) {
    existingMenu.remove();
  }
  const contextMenu = document.createElement("div");
  contextMenu.id = "tab-context-menu";
  contextMenu.className = "context-menu";
  contextMenu.style.position = "fixed";
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  if (!isBookmarkOnly) {
    const addToFavoritesOption = document.createElement("div");
    addToFavoritesOption.className = "context-menu-item";
    addToFavoritesOption.textContent = "Add to Favorites";
    addToFavoritesOption.addEventListener("click", async () => {
      await chrome.tabs.update(tab.id, { pinned: true });
      contextMenu.remove();
    });
    contextMenu.appendChild(addToFavoritesOption);
    const pinInSpaceOption = document.createElement("div");
    pinInSpaceOption.className = "context-menu-item";
    pinInSpaceOption.textContent = isPinned ? "Unpin Tab" : "Pin Tab";
    pinInSpaceOption.addEventListener("click", () => {
      chrome.runtime.sendMessage({ command: "toggleSpacePin", tabId: tab.id });
      contextMenu.remove();
    });
    contextMenu.appendChild(pinInSpaceOption);
    const separator = document.createElement("div");
    separator.className = "context-menu-separator";
    contextMenu.appendChild(separator);
    const moveToSpaceItem = document.createElement("div");
    moveToSpaceItem.className = "context-menu-item with-submenu";
    moveToSpaceItem.textContent = "Move to Space";
    const submenu = document.createElement("div");
    submenu.className = "context-menu submenu";
    const currentSpace = spaces2.find((s) => s.temporaryTabs.includes(tab.id) || s.spaceBookmarks.includes(tab.id));
    const otherActiveSpaces = spaces2.filter((s) => s.id !== currentSpace?.id);
    otherActiveSpaces.forEach((space) => {
      const submenuItem = document.createElement("div");
      submenuItem.className = "context-menu-item";
      submenuItem.textContent = space.name;
      submenuItem.addEventListener("click", async (e) => {
        e.stopPropagation();
        contextMenu.remove();
        await moveTabToSpace2(tab.id, space.id, false);
        await setActiveSpace2(space.id, false);
        await chrome.tabs.update(tab.id, { active: true });
      });
      submenu.appendChild(submenuItem);
    });
    const activeSpaceNames = new Set(spaces2.map((s) => s.name));
    const inactiveSpaceFolders = allBookmarkSpaceFolders.filter((f) => !f.url && !activeSpaceNames.has(f.title));
    if (otherActiveSpaces.length > 0 && inactiveSpaceFolders.length > 0) {
      const separator2 = document.createElement("div");
      separator2.className = "context-menu-separator";
      submenu.appendChild(separator2);
    }
    inactiveSpaceFolders.forEach((folder) => {
      const submenuItem = document.createElement("div");
      submenuItem.className = "context-menu-item";
      submenuItem.textContent = folder.title;
      submenuItem.addEventListener("click", (e) => {
        e.stopPropagation();
        createSpaceFromInactive2(folder.title, tab);
        contextMenu.remove();
      });
      submenu.appendChild(submenuItem);
    });
    if (submenu.hasChildNodes()) {
      moveToSpaceItem.appendChild(submenu);
      contextMenu.appendChild(moveToSpaceItem);
    }
  }
  if (!isBookmarkOnly) {
    const archiveOption = document.createElement("div");
    archiveOption.className = "context-menu-item";
    archiveOption.textContent = "Archive Tab";
    archiveOption.addEventListener("click", async () => {
      await Utils.archiveTab(tab.id);
      contextMenu.remove();
    });
    contextMenu.appendChild(archiveOption);
  }
  const closeOption = document.createElement("div");
  closeOption.className = "context-menu-item";
  closeOption.textContent = isBookmarkOnly ? "Remove Bookmark" : "Close Tab";
  closeOption.addEventListener("click", () => {
    closeTab2(tabElement, tab, isPinned, isBookmarkOnly);
    contextMenu.remove();
  });
  contextMenu.appendChild(closeOption);
  document.body.appendChild(contextMenu);
  const closeContextMenu = (e) => {
    if (!contextMenu.contains(e.target)) {
      contextMenu.remove();
      document.removeEventListener("click", closeContextMenu, { capture: true });
    }
  };
  document.addEventListener("click", closeContextMenu, { capture: true });
}
async function showArchivedTabsPopup(activeSpaceId2) {
  const spaceElement = document.querySelector(`[data-space-id="${activeSpaceId2}"]`);
  const popup = spaceElement.querySelector(".archived-tabs-popup");
  const list = popup.querySelector(".archived-tabs-list");
  const message = popup.querySelector(".no-archived-tabs-message");
  list.innerHTML = "";
  let controls = popup.querySelector(".archiving-controls");
  if (!controls) {
    controls = document.createElement("div");
    controls.className = "archiving-controls";
    popup.insertBefore(controls, list);
  } else {
    controls.innerHTML = "";
  }
  const settings = await Utils.getSettings();
  const archivingEnabled = settings.autoArchiveEnabled;
  const archiveTime = settings.autoArchiveIdleMinutes;
  const toggleLabel = document.createElement("label");
  toggleLabel.className = "archiving-toggle-label";
  const toggleWrapper = document.createElement("span");
  toggleWrapper.className = "archiving-toggle";
  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.checked = archivingEnabled;
  const slider = document.createElement("span");
  slider.className = "archiving-toggle-slider";
  toggleWrapper.appendChild(toggle);
  toggleWrapper.appendChild(slider);
  toggleLabel.appendChild(toggleWrapper);
  toggleLabel.appendChild(document.createTextNode("Enable Archiving"));
  controls.appendChild(toggleLabel);
  const timeContainer = document.createElement("div");
  timeContainer.className = "archiving-time-container";
  const timeInput = document.createElement("input");
  timeInput.type = "number";
  timeInput.min = "1";
  timeInput.value = archiveTime;
  timeInput.className = "archiving-time-input";
  timeInput.disabled = !archivingEnabled;
  const minLabel = document.createElement("span");
  minLabel.textContent = "min";
  timeContainer.appendChild(timeInput);
  timeContainer.appendChild(minLabel);
  controls.appendChild(timeContainer);
  toggle.addEventListener("change", async (e) => {
    const enabled = toggle.checked;
    timeInput.disabled = !enabled;
    await Utils.setArchivingEnabled(enabled);
  });
  timeInput.addEventListener("change", async (e) => {
    let val = parseInt(timeInput.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    timeInput.value = val;
    await Utils.setArchiveTime(val);
  });
  if (!archivingEnabled) {
    message.textContent = "Tab Archiving is disabled. Use the toggle above to enable.";
    list.style.display = "none";
    return;
  }
  if (!await Utils.isArchivingEnabled()) {
    message.textContent = "Tab Archiving is disabled. Go to extension settings to enable.";
    list.style.display = "none";
    return;
  }
  const allArchived = await Utils.getArchivedTabs();
  if (allArchived.length === 0) {
    message.textContent = "No archived tabs.";
    list.style.display = "none";
  } else {
    message.textContent = "";
    list.style.display = "block";
    allArchived.forEach((archivedTab) => {
      const item = document.createElement("div");
      item.className = "tab archived-item";
      item.title = `${archivedTab.name}
${archivedTab.url}
Archived: ${new Date(archivedTab.archivedAt).toLocaleString()}`;
      const favicon = document.createElement("img");
      favicon.src = Utils.getFaviconUrl(archivedTab.url);
      favicon.className = "tab-favicon";
      favicon.onerror = () => {
        favicon.src = "assets/default_icon.png";
      };
      const details = document.createElement("div");
      details.className = "tab-details";
      const titleSpan = document.createElement("span");
      titleSpan.className = "tab-title-display";
      titleSpan.textContent = archivedTab.name;
      details.appendChild(titleSpan);
      const restoreButton = document.createElement("button");
      restoreButton.innerHTML = RESTORE_ICON;
      restoreButton.className = "tab-restore";
      restoreButton.style.marginLeft = "auto";
      restoreButton.addEventListener("click", (e) => {
        e.stopPropagation();
        Utils.restoreArchivedTab(archivedTab);
        item.remove();
        if (list.children.length === 0) {
          message.style.display = "block";
          list.style.display = "none";
        }
      });
      item.appendChild(favicon);
      item.appendChild(details);
      item.appendChild(restoreButton);
      list.appendChild(item);
    });
  }
}
function setupQuickPinListener(moveTabToSpace2, moveTabToPinned2, moveTabToTemp2) {
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.command === "quickPinToggle" || request.command === "toggleSpacePin") {
      console.log(`[QuickPin] Received command: ${request.command}`, { request });
      chrome.storage.local.get("spaces", function(result) {
        const spaces2 = result.spaces || [];
        console.log("[QuickPin] Loaded spaces from storage:", spaces2);
        const getTabAndToggle = (tabToToggle) => {
          if (!tabToToggle) {
            console.error("[QuickPin] No tab found to toggle.");
            return;
          }
          console.log("[QuickPin] Toggling pin state for tab:", tabToToggle);
          const spaceWithTempTab = spaces2.find(
            (space) => space.temporaryTabs.includes(tabToToggle.id)
          );
          if (spaceWithTempTab) {
            console.log(`[QuickPin] Tab ${tabToToggle.id} is a temporary tab in space "${spaceWithTempTab.name}". Pinning it.`);
            moveTabToSpace2(tabToToggle.id, spaceWithTempTab.id, true);
            moveTabToPinned2(spaceWithTempTab, tabToToggle);
          } else {
            const spaceWithBookmark = spaces2.find(
              (space) => space.spaceBookmarks.includes(tabToToggle.id)
            );
            if (spaceWithBookmark) {
              console.log(`[QuickPin] Tab ${tabToToggle.id} is a bookmarked tab in space "${spaceWithBookmark.name}". Unpinning it.`);
              moveTabToSpace2(tabToToggle.id, spaceWithBookmark.id, false);
              moveTabToTemp2(spaceWithBookmark, tabToToggle);
            } else {
              console.warn(`[QuickPin] Tab ${tabToToggle.id} not found in any space as temporary or bookmarked.`);
            }
          }
        };
        if (request.command === "quickPinToggle") {
          console.log("[QuickPin] Handling quickPinToggle for active tab.");
          chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            getTabAndToggle(tabs[0]);
          });
        } else if (request.command === "toggleSpacePin" && request.tabId) {
          console.log(`[QuickPin] Handling toggleSpacePin for tabId: ${request.tabId}`);
          chrome.tabs.get(request.tabId, function(tab) {
            getTabAndToggle(tab);
          });
        }
      });
    }
  });
}
const MouseButton = {
  MIDDLE: 1
};
const spacesList = document.getElementById("spacesList");
const spaceSwitcher = document.getElementById("spaceSwitcher");
document.getElementById("addSpaceBtn");
document.getElementById("newTabBtn");
const spaceTemplate = document.getElementById("spaceTemplate");
let spaces = [];
let activeSpaceId = null;
let isCreatingSpace = false;
let isOpeningBookmark = false;
let isDraggingTab = false;
let currentWindow = null;
let defaultSpaceName = "Home";
async function updateBookmarkForTab(tab, bookmarkTitle) {
  console.log("updating bookmark", tab, bookmarkTitle);
  const arcifyFolder = await LocalStorage.getOrCreateArcifyFolder();
  const spaceFolders = await chrome.bookmarks.getChildren(arcifyFolder.id);
  for (const spaceFolder of spaceFolders) {
    console.log("looking for space folder", spaceFolder);
    const bookmarks = await chrome.bookmarks.getChildren(spaceFolder.id);
    console.log("looking for bookmarks", bookmarks);
    const bookmark = bookmarks.find((b) => b.url === tab.url);
    if (bookmark) {
      await chrome.bookmarks.update(bookmark.id, {
        title: bookmarkTitle,
        url: tab.url
      });
    }
  }
}
console.log("hi");
async function updatePinnedFavicons() {
  const pinnedFavicons = document.getElementById("pinnedFavicons");
  const pinnedTabs = await chrome.tabs.query({ pinned: true });
  Array.from(pinnedFavicons.children).forEach((element) => {
    if (element.classList.contains("pinned-favicon")) {
      const tabId = element.dataset.tabId;
      if (!pinnedTabs.some((tab) => tab.id.toString() === tabId)) {
        element.remove();
      }
    }
  });
  pinnedTabs.forEach((tab) => {
    const existingElement = pinnedFavicons.querySelector(`[data-tab-id="${tab.id}"]`);
    if (!existingElement) {
      const faviconElement = document.createElement("div");
      faviconElement.className = "pinned-favicon";
      faviconElement.title = tab.title;
      faviconElement.dataset.tabId = tab.id;
      faviconElement.draggable = true;
      const img = document.createElement("img");
      img.src = Utils.getFaviconUrl(tab.url, "96");
      img.onerror = () => {
        img.src = tab.favIconUrl;
        img.onerror = () => {
          img.src = "assets/default_icon.png";
        };
      };
      img.alt = tab.title;
      faviconElement.appendChild(img);
      faviconElement.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".pinned-favicon").forEach((t) => t.classList.remove("active"));
        faviconElement.classList.add("active");
        chrome.tabs.update(tab.id, { active: true });
      });
      faviconElement.addEventListener("dragstart", () => {
        faviconElement.classList.add("dragging");
      });
      faviconElement.addEventListener("dragend", () => {
        faviconElement.classList.remove("dragging");
      });
      pinnedFavicons.appendChild(faviconElement);
    }
  });
  const placeholderContainer = pinnedFavicons.querySelector(".pinned-placeholder-container");
  if (placeholderContainer) {
    if (pinnedTabs.length === 0) {
      placeholderContainer.style.display = "block";
    } else {
      placeholderContainer.style.display = "none";
    }
  }
  pinnedFavicons.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
  });
  pinnedFavicons.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
  });
  pinnedFavicons.addEventListener("drop", async (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    const draggingElement = document.querySelector(".dragging");
    if (draggingElement && draggingElement.dataset.tabId) {
      const tabId = parseInt(draggingElement.dataset.tabId);
      await chrome.tabs.update(tabId, { pinned: true });
      updatePinnedFavicons();
      draggingElement.remove();
    }
  });
}
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing sidebar...");
  initSidebar();
  updatePinnedFavicons();
  chrome.tabs.onCreated.addListener(handleTabCreated);
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    handleTabUpdate(tabId, changeInfo, tab);
    if (tab.pinned) updatePinnedFavicons();
  });
  chrome.tabs.onRemoved.addListener(handleTabRemove);
  chrome.tabs.onActivated.addListener(handleTabActivated);
  setupQuickPinListener(moveTabToSpace, moveTabToPinned, moveTabToTemp);
  const closePlaceholderBtn = document.querySelector(".placeholder-close-btn");
  const placeholderContainer = document.querySelector(".pinned-placeholder-container");
  if (closePlaceholderBtn && placeholderContainer) {
    closePlaceholderBtn.addEventListener("click", () => {
      placeholderContainer.style.display = "none";
    });
  }
  let isSwiping = false;
  let swipeTimeout = null;
  const swipeThreshold = 25;
  document.getElementById("sidebar-container").addEventListener("wheel", async (event) => {
    if (Math.abs(event.deltaX) < Math.abs(event.deltaY) || isSwiping) {
      return;
    }
    if (Math.abs(event.deltaX) > swipeThreshold) {
      isSwiping = true;
      event.preventDefault();
      const currentIndex = spaces.findIndex((s) => s.id === activeSpaceId);
      if (currentIndex === -1) {
        isSwiping = false;
        return;
      }
      let nextIndex;
      if (event.deltaX < 0) {
        nextIndex = (currentIndex - 1 + spaces.length) % spaces.length;
      } else {
        nextIndex = (currentIndex + 1) % spaces.length;
      }
      const nextSpace = spaces[nextIndex];
      if (nextSpace) {
        await setActiveSpace(nextSpace.id);
      }
      clearTimeout(swipeTimeout);
      swipeTimeout = setTimeout(() => {
        isSwiping = false;
      }, 400);
    }
  }, { passive: false });
});
async function initSidebar() {
  console.log("Initializing sidebar...");
  let settings = await Utils.getSettings();
  if (settings.defaultSpaceName) {
    defaultSpaceName = settings.defaultSpaceName;
  }
  try {
    currentWindow = await chrome.windows.getCurrent({ populate: false });
    let tabGroups = await chrome.tabGroups.query({});
    let allTabs = await chrome.tabs.query({ currentWindow: true });
    console.log("tabGroups", tabGroups);
    console.log("allTabs", allTabs);
    await LocalStorage.mergeDuplicateSpaceFolders();
    const spacesFolder = await LocalStorage.getOrCreateArcifyFolder();
    console.log("spacesFolder", spacesFolder);
    const subFolders = await chrome.bookmarks.getChildren(spacesFolder.id);
    console.log("subFolders", subFolders);
    if (tabGroups.length === 0) {
      let currentTabs = allTabs.filter((tab) => tab.id && !tab.pinned) ?? [];
      if (currentTabs.length == 0) {
        await chrome.tabs.create({ active: true });
        allTabs = await chrome.tabs.query({});
        currentTabs = allTabs.filter((tab) => tab.id && !tab.pinned) ?? [];
      }
      console.log("currentTabs", currentTabs);
      const groupId = await chrome.tabs.group({ tabIds: currentTabs.map((tab) => tab.id) });
      const groupColor = await Utils.getTabGroupColor(defaultSpaceName);
      await chrome.tabGroups.update(groupId, { title: defaultSpaceName, color: groupColor });
      const defaultSpace = {
        id: groupId,
        uuid: Utils.generateUUID(),
        name: defaultSpaceName,
        color: groupColor,
        spaceBookmarks: [],
        temporaryTabs: currentTabs.map((tab) => tab.id)
      };
      const bookmarkFolder = subFolders.find((f) => !f.url && f.title == defaultSpaceName);
      if (!bookmarkFolder) {
        await chrome.bookmarks.create({
          parentId: spacesFolder.id,
          title: defaultSpaceName
        });
      }
      spaces = [defaultSpace];
      saveSpaces();
      createSpaceElement(defaultSpace);
      await setActiveSpace(defaultSpace.id);
    } else {
      const ungroupedTabs = allTabs.filter((tab) => tab.groupId === -1 && !tab.pinned);
      let defaultGroupId = null;
      if (ungroupedTabs.length > 0) {
        console.log("found ungrouped tabs", ungroupedTabs);
        const defaultGroup = tabGroups.find((group) => group.title === defaultSpaceName);
        if (defaultGroup) {
          console.log("found existing default group", defaultGroup);
          if (defaultGroup.windowId === currentWindow.id) {
            await chrome.tabs.group({ tabIds: ungroupedTabs.map((tab) => tab.id), groupId: defaultGroup.id });
          } else {
            defaultGroupId = await chrome.tabs.group({ tabIds: ungroupedTabs.map((tab) => tab.id) });
            await chrome.tabGroups.update(defaultGroupId, { title: defaultSpaceName + currentWindow.id, color: "grey" });
          }
        } else {
          defaultGroupId = await chrome.tabs.group({ tabIds: ungroupedTabs.map((tab) => tab.id) });
          await chrome.tabGroups.update(defaultGroupId, { title: defaultSpaceName, color: "grey" });
        }
      }
      tabGroups = await chrome.tabGroups.query({});
      spaces = await Promise.all(tabGroups.map(async (group) => {
        const tabs = await chrome.tabs.query({ groupId: group.id });
        console.log("processing group", group);
        const mainFolder = await chrome.bookmarks.getSubTree(spacesFolder.id);
        const bookmarkFolder = mainFolder[0].children?.find((f) => f.title == group.title);
        console.log("looking for existing folder", group.title, mainFolder, bookmarkFolder);
        let spaceBookmarks = [];
        if (!bookmarkFolder) {
          console.log("creating new folder", group.title);
          await chrome.bookmarks.create({
            parentId: spacesFolder.id,
            title: group.title
          });
        } else {
          console.log("found folder", group.title);
          spaceBookmarks = await Utils.processBookmarkFolder(bookmarkFolder, group.id);
          spaceBookmarks = spaceBookmarks.filter((id) => id !== null);
          console.log("space bookmarks in", group.title, spaceBookmarks);
        }
        const space = {
          id: group.id,
          uuid: Utils.generateUUID(),
          name: group.title,
          color: group.color,
          spaceBookmarks,
          temporaryTabs: tabs.filter((tab) => !spaceBookmarks.includes(tab.id)).map((tab) => tab.id)
        };
        return space;
      }));
      spaces.forEach((space) => createSpaceElement(space));
      console.log("initial save", spaces);
      saveSpaces();
      let activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTabs.length > 0) {
        const activeTab = activeTabs[0];
        if (activeTab.pinned) {
          await setActiveSpace(spaces[0].id, false);
          updatePinnedFavicons();
        } else {
          await setActiveSpace(activeTab.groupId, false);
        }
      } else {
        await setActiveSpace(defaultGroupId ?? spaces[0].id);
      }
    }
  } catch (error) {
    console.error("Error initializing sidebar:", error);
  }
  setupDOMElements(createNewSpace, createNewTab);
}
function createSpaceElement(space) {
  console.log("Creating space element for:", space.id);
  const spaceElement = spaceTemplate.content.cloneNode(true);
  const sidebarContainer = document.getElementById("sidebar-container");
  const spaceContainer = spaceElement.querySelector(".space");
  spaceContainer.dataset.spaceId = space.id;
  spaceContainer.style.display = space.id === activeSpaceId ? "block" : "none";
  spaceContainer.dataset.spaceUuid = space.id;
  sidebarContainer.style.setProperty("--space-bg-color", `var(--chrome-${space.color}-color, rgba(255, 255, 255, 0.1))`);
  sidebarContainer.style.setProperty("--space-bg-color-dark", `var(--chrome-${space.color}-color-dark, rgba(255, 255, 255, 0.1))`);
  const colorSelect = spaceElement.getElementById("spaceColorSelect");
  colorSelect.value = space.color;
  colorSelect.addEventListener("change", async () => {
    const newColor = colorSelect.value;
    space.color = newColor;
    await chrome.tabGroups.update(space.id, { color: newColor });
    sidebarContainer.style.setProperty("--space-bg-color", `var(--chrome-${newColor}-color, rgba(255, 255, 255, 0.1))`);
    sidebarContainer.style.setProperty("--space-bg-color-dark", `var(--chrome-${space.color}-color-dark, rgba(255, 255, 255, 0.1))`);
    saveSpaces();
    await updateSpaceSwitcher();
  });
  const spaceOptionColorSwatch = spaceElement.getElementById("spaceOptionColorSwatch");
  spaceOptionColorSwatch.addEventListener("click", (e) => {
    if (e.target.classList.contains("color-swatch")) {
      const colorPicker = e.target.closest(".color-picker-grid");
      const color = e.target.dataset.color;
      colorPicker.querySelectorAll(".color-swatch").forEach((swatch) => {
        swatch.classList.remove("selected");
      });
      e.target.classList.add("selected");
      colorSelect.value = color;
      const event = new Event("change");
      colorSelect.dispatchEvent(event);
    }
  });
  const nameInput = spaceElement.querySelector(".space-name");
  nameInput.value = space.name;
  nameInput.addEventListener("change", async () => {
    const oldName = space.name;
    const oldFolder = await LocalStorage.getOrCreateSpaceFolder(oldName);
    await chrome.bookmarks.update(oldFolder.id, { title: nameInput.value });
    const tabGroups = await chrome.tabGroups.query({});
    const tabGroupForSpace = tabGroups.find((group) => group.id === space.id);
    console.log("updating tabGroupForSpace", tabGroupForSpace);
    if (tabGroupForSpace) {
      await chrome.tabGroups.update(tabGroupForSpace.id, { title: nameInput.value, color: "grey" });
    }
    space.name = nameInput.value;
    saveSpaces();
    await updateSpaceSwitcher();
  });
  const pinnedContainer = spaceElement.querySelector('[data-tab-type="pinned"]');
  const tempContainer = spaceElement.querySelector('[data-tab-type="temporary"]');
  setupDragAndDrop(pinnedContainer, tempContainer);
  const cleanBtn = spaceElement.querySelector(".clean-tabs-btn");
  cleanBtn.addEventListener("click", () => cleanTemporaryTabs(space.id));
  const newFolderBtn = spaceElement.querySelector(".new-folder-btn");
  const deleteSpaceBtn = spaceElement.querySelector(".delete-space-btn");
  newFolderBtn.addEventListener("click", () => {
    createNewFolder(spaceContainer);
  });
  deleteSpaceBtn.addEventListener("click", () => {
    if (confirm("Delete this space and close all its tabs?")) {
      deleteSpace(space.id);
    }
  });
  loadTabs(space, pinnedContainer, tempContainer);
  const popup = spaceElement.querySelector(".archived-tabs-popup");
  const archiveButton = spaceElement.querySelector(".sidebar-button");
  const spaceContent = spaceElement.querySelector(".space-content");
  archiveButton.addEventListener("click", (e) => {
    e.stopPropagation();
    spaceContent.classList.toggle("hidden");
    const isVisible = popup.style.opacity == 1;
    if (isVisible) {
      popup.classList.toggle("visible");
    } else {
      showArchivedTabsPopup(space.id);
      popup.classList.toggle("visible");
    }
  });
  spacesList.appendChild(spaceElement);
}
async function updateSpaceSwitcher() {
  console.log("Updating space switcher...");
  spaceSwitcher.innerHTML = "";
  let draggedButton = null;
  spaceSwitcher.addEventListener("dragover", (e) => {
    e.preventDefault();
    const currentlyDragged = document.querySelector(".dragging-switcher");
    if (!currentlyDragged) return;
    const afterElement = getDragAfterElementSwitcher(spaceSwitcher, e.clientX);
    const buttons = spaceSwitcher.querySelectorAll("button");
    buttons.forEach((button) => {
      button.classList.remove("drag-over-placeholder-before", "drag-over-placeholder-after");
    });
    if (afterElement) {
      afterElement.classList.add("drag-over-placeholder-before");
    } else {
      const lastElement = spaceSwitcher.querySelector("button:not(.dragging-switcher):last-of-type");
      if (lastElement) {
        lastElement.classList.add("drag-over-placeholder-after");
      }
    }
  });
  spaceSwitcher.addEventListener("dragleave", (e) => {
    if (e.target === spaceSwitcher) {
      const buttons = spaceSwitcher.querySelectorAll("button");
      buttons.forEach((button) => {
        button.classList.remove("drag-over-placeholder-before", "drag-over-placeholder-after");
      });
    }
  });
  spaceSwitcher.addEventListener("drop", async (e) => {
    e.preventDefault();
    const buttons = spaceSwitcher.querySelectorAll("button");
    buttons.forEach((button) => {
      button.classList.remove("drag-over-placeholder-before", "drag-over-placeholder-after");
    });
    if (draggedButton) {
      const targetElement = e.target.closest("button");
      const draggedSpaceId = parseInt(draggedButton.dataset.spaceId);
      let targetSpaceId = targetElement ? parseInt(targetElement.dataset.spaceId) : null;
      const originalIndex = spaces.findIndex((s) => s.id === draggedSpaceId);
      if (originalIndex === -1) return;
      const draggedSpace = spaces[originalIndex];
      spaces.splice(originalIndex, 1);
      let newIndex;
      if (targetSpaceId) {
        const targetIndex = spaces.findIndex((s) => s.id === targetSpaceId);
        const targetRect = targetElement.getBoundingClientRect();
        const dropX = e.clientX;
        if (dropX < targetRect.left + targetRect.width / 2) {
          newIndex = targetIndex;
        } else {
          newIndex = targetIndex + 1;
        }
      } else {
        newIndex = spaces.length;
      }
      console.log("droppedat", newIndex);
      if (newIndex < 0) {
        newIndex = 0;
      } else if (newIndex > spaces.length) {
        newIndex = spaces.length;
      }
      console.log("set", newIndex);
      spaces.splice(newIndex, 0, draggedSpace);
      saveSpaces();
      await updateSpaceSwitcher();
    }
    draggedButton = null;
  });
  spaces.forEach((space) => {
    const button = document.createElement("button");
    button.textContent = space.name;
    button.dataset.spaceId = space.id;
    button.classList.toggle("active", space.id === activeSpaceId);
    button.draggable = true;
    button.addEventListener("click", async () => {
      if (button.classList.contains("dragging-switcher")) return;
      console.log("clicked for active", space);
      await setActiveSpace(space.id);
    });
    button.addEventListener("dragstart", (e) => {
      draggedButton = button;
      setTimeout(() => button.classList.add("dragging-switcher"), 0);
      e.dataTransfer.effectAllowed = "move";
    });
    button.addEventListener("dragend", () => {
      const buttons = spaceSwitcher.querySelectorAll("button");
      buttons.forEach((btn) => {
        btn.classList.remove("drag-over-placeholder-before", "drag-over-placeholder-after");
      });
      if (draggedButton) {
        draggedButton.classList.remove("dragging-switcher");
      }
      draggedButton = null;
    });
    spaceSwitcher.appendChild(button);
  });
  const arcifyFolder = await LocalStorage.getOrCreateArcifyFolder();
  const spaceFolders = await chrome.bookmarks.getChildren(arcifyFolder.id);
  spaceFolders.forEach((spaceFolder) => {
    if (spaces.find((space) => space.name == spaceFolder.title)) {
      return;
    } else {
      const button = document.createElement("button");
      button.textContent = spaceFolder.title;
      button.addEventListener("click", async () => {
        const newTab = await ChromeHelper.createNewTab();
        await createSpaceFromInactive(spaceFolder.title, newTab);
      });
      spaceSwitcher.appendChild(button);
    }
  });
}
function getDragAfterElementSwitcher(container, x) {
  const draggableElements = [...container.querySelectorAll("button:not(.dragging-switcher)")];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = x - box.left - box.width / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".tab:not(.dragging), .folder:not(.dragging)")];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}
async function setActiveSpace(spaceId, updateTab = true) {
  console.log("Setting active space:", spaceId);
  activeSpaceId = spaceId;
  await activateSpaceInDOM(spaceId, spaces, updateSpaceSwitcher);
  let tabGroups = await chrome.tabGroups.query({});
  let tabGroupsToClose = tabGroups.filter((group) => group.id !== spaceId);
  tabGroupsToClose.forEach(async (group) => {
    await chrome.tabGroups.update(group.id, { collapsed: true });
  });
  const tabGroupForSpace = tabGroups.find((group) => group.id === spaceId);
  if (!tabGroupForSpace) {
    isCreatingSpace = true;
    const space = spaces.find((s) => s.id === spaceId);
    const newTab = await ChromeHelper.createNewTab();
    const groupId = await ChromeHelper.createNewTabGroup(newTab, space.name, space.color);
    spaces = spaces.map((s) => {
      if (s.id === spaceId) {
        return { ...s, id: groupId };
      }
      return s;
    });
    saveSpaces();
    isCreatingSpace = false;
  } else {
    await chrome.tabGroups.update(spaceId, { collapsed: false });
    if (updateTab) {
      const space = spaces.find((s) => s.id === parseInt(spaceId));
      console.log("updateTab space", space);
      chrome.tabs.query({ groupId: spaceId }, (tabs) => {
        if (tabs.length > 0) {
          const lastTab = space.lastTab ?? tabs[tabs.length - 1].id;
          chrome.tabs.update(lastTab, { active: true });
          activateTabInDOM(lastTab);
        }
      });
    }
  }
}
async function createSpaceFromInactive(spaceName, tabToMove) {
  console.log(`Creating inactive space "${spaceName}" with tab:`, tabToMove);
  isCreatingSpace = true;
  try {
    const arcifyFolder = await LocalStorage.getOrCreateArcifyFolder();
    const spaceFolders = await chrome.bookmarks.getChildren(arcifyFolder.id);
    const spaceFolder = spaceFolders.find((f) => f.title === spaceName);
    if (!spaceFolder) {
      console.error(`Bookmark folder for inactive space "${spaceName}" not found.`);
      return;
    }
    const groupColor = await Utils.getTabGroupColor(spaceName);
    const groupId = await ChromeHelper.createNewTabGroup(tabToMove, spaceName, groupColor);
    const spaceBookmarks = await Utils.processBookmarkFolder(spaceFolder, groupId);
    const space = {
      id: groupId,
      uuid: Utils.generateUUID(),
      name: spaceName,
      color: groupColor,
      spaceBookmarks,
      temporaryTabs: [tabToMove.id],
      lastTab: tabToMove.id
    };
    const oldSpace = spaces.find(
      (s) => s.temporaryTabs.includes(tabToMove.id) || s.spaceBookmarks.includes(tabToMove.id)
    );
    if (oldSpace) {
      oldSpace.temporaryTabs = oldSpace.temporaryTabs.filter((id) => id !== tabToMove.id);
      oldSpace.spaceBookmarks = oldSpace.spaceBookmarks.filter((id) => id !== tabToMove.id);
    }
    const tabElementToRemove = document.querySelector(`[data-tab-id="${tabToMove.id}"]`);
    if (tabElementToRemove) {
      tabElementToRemove.remove();
    }
    spaces.push(space);
    saveSpaces();
    createSpaceElement(space);
    await setActiveSpace(space.id);
    updateSpaceSwitcher();
  } catch (error) {
    console.error(`Error creating space from inactive bookmark:`, error);
  } finally {
    isCreatingSpace = false;
  }
}
function saveSpaces() {
  console.log("Saving spaces to storage...", spaces);
  chrome.storage.local.set({ spaces }, () => {
    console.log("Spaces saved successfully");
  });
}
async function moveTabToPinned(space, tab) {
  space.temporaryTabs = space.temporaryTabs.filter((id) => id !== tab.id);
  if (!space.spaceBookmarks.includes(tab.id)) {
    space.spaceBookmarks.push(tab.id);
  }
  const spaceFolder = await LocalStorage.getOrCreateSpaceFolder(space.name);
  const bookmarks = await chrome.bookmarks.getChildren(spaceFolder.id);
  const existingBookmark = bookmarks.find((b) => b.url === tab.url);
  if (!existingBookmark) {
    await Utils.searchAndRemoveBookmark(spaceFolder.id, tab.url);
    await chrome.bookmarks.create({
      parentId: spaceFolder.id,
      title: tab.title,
      url: tab.url
    });
  }
}
async function moveTabToTemp(space, tab) {
  const arcifyFolder = await LocalStorage.getOrCreateArcifyFolder();
  const spaceFolders = await chrome.bookmarks.getChildren(arcifyFolder.id);
  const spaceFolder = spaceFolders.find((f) => f.title === space.name);
  if (spaceFolder) {
    await Utils.searchAndRemoveBookmark(spaceFolder.id, tab.url);
  }
  space.spaceBookmarks = space.spaceBookmarks.filter((id) => id !== tab.id);
  if (!space.temporaryTabs.includes(tab.id)) {
    space.temporaryTabs.push(tab.id);
  }
  saveSpaces();
}
async function setupDragAndDrop(pinnedContainer, tempContainer) {
  console.log("Setting up drag and drop handlers...");
  [pinnedContainer, tempContainer].forEach((container) => {
    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      const draggingElement = document.querySelector(".dragging");
      if (draggingElement) {
        const targetFolder = e.target.closest(".folder-content");
        const targetContainer = targetFolder || container;
        const afterElement = getDragAfterElement(targetContainer, e.clientY);
        if (afterElement) {
          targetContainer.insertBefore(draggingElement, afterElement);
        } else {
          targetContainer.appendChild(draggingElement);
        }
        if (container.dataset.tabType === "pinned" && draggingElement.dataset.tabId && !isDraggingTab) {
          console.log("Tab dragged to pinned section or folder");
          isDraggingTab = true;
          const tabId = parseInt(draggingElement.dataset.tabId);
          chrome.tabs.get(tabId, async (tab) => {
            const spaceId = container.closest(".space").dataset.spaceId;
            const space = spaces.find((s) => s.id === parseInt(spaceId));
            if (space && tab) {
              space.temporaryTabs = space.temporaryTabs.filter((id) => id !== tabId);
              if (!space.spaceBookmarks.includes(tabId)) {
                space.spaceBookmarks.push(tabId);
              }
              const targetFolderContent = draggingElement.closest(".folder-content");
              const targetFolder2 = targetFolderContent ? targetFolderContent.closest(".folder") : null;
              const spaceFolder = await LocalStorage.getOrCreateSpaceFolder(space.name);
              if (spaceFolder) {
                let parentId = spaceFolder.id;
                if (targetFolder2) {
                  console.log("moving into a folder");
                  const folderElement = targetFolder2.closest(".folder");
                  const folderName = folderElement.querySelector(".folder-name").value;
                  const existingFolders = await chrome.bookmarks.getChildren(spaceFolder.id);
                  let folder = existingFolders.find((f) => f.title === folderName);
                  if (!folder) {
                    folder = await chrome.bookmarks.create({
                      parentId: spaceFolder.id,
                      title: folderName
                    });
                  }
                  parentId = folder.id;
                  const existingBookmarks = await chrome.bookmarks.getChildren(parentId);
                  if (existingBookmarks.some((b) => b.url === tab.url)) {
                    console.log("Bookmark already exists in folder:", folderName);
                    isDraggingTab = false;
                    return;
                  }
                  await Utils.searchAndRemoveBookmark(spaceFolder.id, tab.url);
                  await chrome.bookmarks.create({
                    parentId,
                    title: tab.title,
                    url: tab.url
                  });
                  const placeHolderElement = folderElement.querySelector(".tab-placeholder");
                  if (placeHolderElement) {
                    console.log("hiding from", folderElement);
                    placeHolderElement.classList.add("hidden");
                  }
                } else {
                  await moveTabToPinned(space, tab);
                }
              }
              saveSpaces();
            }
            isDraggingTab = false;
          });
        } else if (container.dataset.tabType === "temporary" && draggingElement.dataset.tabId && !isDraggingTab) {
          console.log("Tab dragged to temporary section");
          isDraggingTab = true;
          const tabId = parseInt(draggingElement.dataset.tabId);
          chrome.tabs.get(tabId, async (tab) => {
            const space = spaces.find((s) => s.id === parseInt(activeSpaceId));
            if (space && tab) {
              moveTabToTemp(space, tab);
            }
            isDraggingTab = false;
          });
        } else if (draggingElement && draggingElement.classList.contains("pinned-favicon") && draggingElement.dataset.tabId) {
          const tabId = parseInt(draggingElement.dataset.tabId);
          chrome.tabs.update(tabId, { pinned: false });
        }
      }
    });
  });
}
async function createNewFolder(spaceElement) {
  const pinnedContainer = spaceElement.querySelector('[data-tab-type="pinned"]');
  const folderTemplate = document.getElementById("folderTemplate");
  const newFolder = folderTemplate.content.cloneNode(true);
  const folderElement = newFolder.querySelector(".folder");
  const folderHeader = folderElement.querySelector(".folder-header");
  const folderTitle = folderElement.querySelector(".folder-title");
  const folderNameInput = folderElement.querySelector(".folder-name");
  const folderIcon = folderElement.querySelector(".folder-icon");
  const folderToggle = folderElement.querySelector(".folder-toggle");
  const folderContent = folderElement.querySelector(".folder-content");
  folderElement.classList.toggle("collapsed");
  folderContent.classList.toggle("collapsed");
  folderToggle.classList.toggle("collapsed");
  folderHeader.addEventListener("click", () => {
    folderElement.classList.toggle("collapsed");
    folderContent.classList.toggle("collapsed");
    folderToggle.classList.toggle("collapsed");
    folderIcon.innerHTML = folderElement.classList.contains("collapsed") ? FOLDER_CLOSED_ICON : FOLDER_OPEN_ICON;
  });
  folderNameInput.addEventListener("change", async () => {
    const spaceName = spaceElement.querySelector(".space-name").value;
    const spaceFolder = await LocalStorage.getOrCreateSpaceFolder(spaceName);
    const existingFolders = await chrome.bookmarks.getChildren(spaceFolder.id);
    const folder = existingFolders.find((f) => f.title === folderNameInput.value);
    if (!folder) {
      await chrome.bookmarks.create({
        parentId: spaceFolder.id,
        title: folderNameInput.value
      });
      folderNameInput.classList.toggle("hidden");
      folderTitle.innerHTML = folderNameInput.value;
      folderTitle.classList.toggle("hidden");
    }
  });
  pinnedContainer.appendChild(folderElement);
  folderNameInput.focus();
}
async function loadTabs(space, pinnedContainer, tempContainer) {
  console.log("Loading tabs for space:", space.id);
  console.log("Space bookmarks in space:", space.spaceBookmarks);
  var bookmarkedTabURLs = [];
  try {
    const tabs = await chrome.tabs.query({});
    const arcifyFolder = await LocalStorage.getOrCreateArcifyFolder();
    const spaceFolders = await chrome.bookmarks.getChildren(arcifyFolder.id);
    const spaceFolder = spaceFolders.find((f) => f.title == space.name);
    if (spaceFolder) {
      async function processBookmarkNode(node, container) {
        const bookmarks = await chrome.bookmarks.getChildren(node.id);
        console.log("Processing bookmarks:", bookmarks);
        const processedUrls = /* @__PURE__ */ new Set();
        for (const item of bookmarks) {
          if (!item.url) {
            const folderTemplate = document.getElementById("folderTemplate");
            const newFolder = folderTemplate.content.cloneNode(true);
            const folderElement = newFolder.querySelector(".folder");
            const folderHeader = folderElement.querySelector(".folder-header");
            const folderIcon = folderElement.querySelector(".folder-icon");
            const folderTitle = folderElement.querySelector(".folder-title");
            const folderNameInput = folderElement.querySelector(".folder-name");
            const folderContent = folderElement.querySelector(".folder-content");
            const folderToggle = folderElement.querySelector(".folder-toggle");
            const placeHolderElement = folderElement.querySelector(".tab-placeholder");
            folderElement.addEventListener("contextmenu", async (e) => {
              e.preventDefault();
              const contextMenu = document.createElement("div");
              contextMenu.classList.add("context-menu");
              contextMenu.style.position = "fixed";
              contextMenu.style.left = `${e.clientX}px`;
              contextMenu.style.top = `${e.clientY}px`;
              const deleteOption = document.createElement("div");
              deleteOption.classList.add("context-menu-item");
              deleteOption.textContent = "Delete Folder";
              deleteOption.addEventListener("click", async () => {
                if (confirm("Are you sure you want to delete this folder and all its contents?")) {
                  const arcifyFolder2 = await LocalStorage.getOrCreateArcifyFolder();
                  const spaceFolders2 = await chrome.bookmarks.getChildren(arcifyFolder2.id);
                  const spaceFolder2 = spaceFolders2.find((f) => f.title === space.name);
                  if (spaceFolder2) {
                    const folders = await chrome.bookmarks.getChildren(spaceFolder2.id);
                    const folder = folders.find((f) => f.title === item.title);
                    if (folder) {
                      await chrome.bookmarks.removeTree(folder.id);
                      folderElement.remove();
                    }
                  }
                }
                contextMenu.remove();
              });
              contextMenu.appendChild(deleteOption);
              document.body.appendChild(contextMenu);
              const closeContextMenu = (e2) => {
                if (!contextMenu.contains(e2.target)) {
                  contextMenu.remove();
                  document.removeEventListener("click", closeContextMenu);
                }
              };
              document.addEventListener("click", closeContextMenu);
            });
            folderHeader.addEventListener("click", () => {
              folderElement.classList.toggle("collapsed");
              folderContent.classList.toggle("collapsed");
              folderToggle.classList.toggle("collapsed");
              folderIcon.innerHTML = folderElement.classList.contains("collapsed") ? FOLDER_CLOSED_ICON : FOLDER_OPEN_ICON;
            });
            folderNameInput.value = item.title;
            folderNameInput.readOnly = true;
            folderNameInput.disabled = true;
            folderNameInput.classList.toggle("hidden");
            folderTitle.innerHTML = item.title;
            folderTitle.classList.toggle("hidden");
            placeHolderElement.classList.remove("hidden");
            container.appendChild(folderElement);
            await processBookmarkNode(item, folderElement.querySelector(".folder-content"));
          } else {
            if (!processedUrls.has(item.url)) {
              const existingTab = tabs.find((t) => t.url === item.url);
              if (existingTab) {
                console.log("Creating UI element for active bookmark:", existingTab);
                bookmarkedTabURLs.push(existingTab.url);
                const tabElement = await createTabElement(existingTab, true);
                console.log("Appending tab element to container:", tabElement);
                container.appendChild(tabElement);
              } else {
                const bookmarkTab = {
                  id: null,
                  title: item.title,
                  url: item.url,
                  favIconUrl: null,
                  spaceName: space.name
                };
                console.log("Creating UI element for inactive bookmark:", item);
                const tabElement = await createTabElement(bookmarkTab, true, true);
                bookmarkedTabURLs.push(item.url);
                container.appendChild(tabElement);
              }
              processedUrls.add(item.url);
              const placeHolderElement = container.querySelector(".tab-placeholder");
              if (placeHolderElement) {
                placeHolderElement.classList.add("hidden");
              }
            }
          }
        }
        return bookmarkedTabURLs;
      }
      bookmarkedTabURLs = await processBookmarkNode(spaceFolder, pinnedContainer);
    }
    space.temporaryTabs.forEach(async (tabId) => {
      console.log("checking", tabId, spaces);
      const tab = tabs.find((t) => t.id === tabId);
      const pinned = bookmarkedTabURLs.find((url) => url == tab.url);
      console.log("pinned", pinned);
      if (tab && pinned == null) {
        const tabElement = await createTabElement(tab);
        tempContainer.appendChild(tabElement);
      }
    });
  } catch (error) {
    console.error("Error loading tabs:", error);
  }
}
async function closeTab(tabElement, tab, isPinned = false, isBookmarkOnly = false) {
  console.log("Closing tab:", tab, tabElement, isPinned, isBookmarkOnly);
  if (isBookmarkOnly) {
    const arcifyFolder = await LocalStorage.getOrCreateArcifyFolder();
    const spaceFolders = await chrome.bookmarks.getChildren(arcifyFolder.id);
    const activeSpace2 = spaces.find((s) => s.id === activeSpaceId);
    const spaceFolder = spaceFolders.find((f) => f.title === activeSpace2.name);
    console.log("spaceFolder", spaceFolder);
    if (spaceFolder) {
      await Utils.searchAndRemoveBookmark(spaceFolder.id, tab.url, {
        removeTabElement: true,
        tabElement,
        logRemoval: true
      });
    }
    return;
  }
  const tabsInGroup = await chrome.tabs.query({ groupId: activeSpaceId });
  console.log("tabsInGroup", tabsInGroup);
  if (tabsInGroup.length < 2) {
    console.log("creating new tab");
    await createNewTab(async () => {
      closeTab(tabElement, tab, isPinned, isBookmarkOnly);
    });
    return;
  }
  const activeSpace = spaces.find((s) => s.id === activeSpaceId);
  console.log("activeSpace", activeSpace);
  const isCurrentlyPinned = activeSpace?.spaceBookmarks.includes(tab.id);
  const isCurrentlyTemporary = activeSpace?.temporaryTabs.includes(tab.id);
  console.log("isCurrentlyPinned", isCurrentlyPinned, "isCurrentlyTemporary", isCurrentlyTemporary, "isPinned", isPinned);
  if (isCurrentlyPinned || isPinned && !isCurrentlyTemporary) {
    const arcifyFolder = await LocalStorage.getOrCreateArcifyFolder();
    const spaceFolders = await chrome.bookmarks.getChildren(arcifyFolder.id);
    const spaceFolder = spaceFolders.find((f) => f.title === activeSpace.name);
    console.log("spaceFolder", spaceFolder);
    if (spaceFolder) {
      console.log("tab", tab);
      const overrides = await Utils.getTabNameOverrides();
      const override = overrides[tab.id];
      const displayTitle = override ? override.name : tab.title;
      const bookmarkTab = {
        id: null,
        title: displayTitle,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        spaceName: tab.spaceName
      };
      const inactiveTabElement = await createTabElement(bookmarkTab, true, true);
      tabElement.replaceWith(inactiveTabElement);
      chrome.tabs.remove(tab.id);
      return;
    }
  } else {
    chrome.tabs.remove(tab.id);
  }
}
async function createTabElement(tab, isPinned = false, isBookmarkOnly = false) {
  console.log("Creating tab element:", tab.id, "IsBookmarkOnly:", isBookmarkOnly);
  const tabElement = document.createElement("div");
  tabElement.classList.add("tab");
  if (isBookmarkOnly) {
    tabElement.classList.add("inactive", "bookmark-only");
    tabElement.dataset.url = tab.url;
  } else {
    tabElement.dataset.tabId = tab.id;
    tabElement.draggable = true;
    if (tab.active) {
      tabElement.classList.add("active");
    }
  }
  const favicon = document.createElement("img");
  favicon.src = Utils.getFaviconUrl(tab.url);
  favicon.classList.add("tab-favicon");
  favicon.onerror = () => {
    favicon.src = tab.favIconUrl;
    favicon.onerror = () => {
      favicon.src = "assets/default_icon.png";
    };
  };
  const tabDetails = document.createElement("div");
  tabDetails.className = "tab-details";
  const titleDisplay = document.createElement("span");
  titleDisplay.className = "tab-title-display";
  const domainDisplay = document.createElement("span");
  domainDisplay.className = "tab-domain-display";
  domainDisplay.style.display = "none";
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.className = "tab-title-input";
  titleInput.style.display = "none";
  titleInput.spellcheck = false;
  tabDetails.appendChild(titleDisplay);
  tabDetails.appendChild(domainDisplay);
  tabDetails.appendChild(titleInput);
  const actionButton = document.createElement("button");
  actionButton.classList.add(isBookmarkOnly ? "tab-remove" : "tab-close");
  actionButton.innerHTML = isBookmarkOnly ? "−" : "×";
  actionButton.title = isBookmarkOnly ? "Remove Bookmark" : "Close Tab";
  actionButton.addEventListener("click", async (e) => {
    e.stopPropagation();
    const activeSpace = spaces.find((s) => s.id === activeSpaceId);
    console.log("activeSpace", activeSpace);
    const isCurrentlyPinned = activeSpace?.spaceBookmarks.includes(tab.id);
    closeTab(tabElement, tab, isCurrentlyPinned, isBookmarkOnly);
  });
  tabElement.appendChild(favicon);
  tabElement.appendChild(tabDetails);
  tabElement.appendChild(actionButton);
  const updateDisplay = async () => {
    if (isBookmarkOnly) {
      titleDisplay.textContent = tab.title || "Bookmark";
      titleDisplay.style.display = "inline";
      titleInput.style.display = "none";
      domainDisplay.style.display = "none";
      return;
    }
    const overrides = await Utils.getTabNameOverrides();
    const override = overrides[tab.id];
    let displayTitle = tab.title;
    let displayDomain = null;
    titleInput.value = tab.title;
    if (override) {
      displayTitle = override.name;
      titleInput.value = override.name;
      try {
        const currentDomain = new URL(tab.url).hostname;
        if (override.originalDomain && currentDomain !== override.originalDomain) {
          displayDomain = currentDomain;
        }
      } catch (e) {
        console.warn("Error parsing URL for domain check:", tab.url, e);
      }
    }
    titleDisplay.textContent = displayTitle;
    if (displayDomain) {
      domainDisplay.textContent = displayDomain;
      domainDisplay.style.display = "block";
    } else {
      domainDisplay.style.display = "none";
    }
    titleDisplay.style.display = "inline";
    titleInput.style.display = "none";
  };
  if (!isBookmarkOnly) {
    tabDetails.addEventListener("dblclick", (e) => {
      if (e.target === favicon || e.target === actionButton) return;
      titleDisplay.style.display = "none";
      domainDisplay.style.display = "none";
      titleInput.style.display = "inline-block";
      titleInput.select();
      titleInput.focus();
    });
    const saveOrCancelEdit = async (save) => {
      if (save) {
        const newName = titleInput.value.trim();
        try {
          const currentTabInfo = await chrome.tabs.get(tab.id);
          const originalTitle = currentTabInfo.title;
          const activeSpace = spaces.find((s) => s.id === activeSpaceId);
          if (newName && newName !== originalTitle) {
            await Utils.setTabNameOverride(tab.id, tab.url, newName);
            if (isPinned) {
              await Utils.updateBookmarkTitleIfNeeded(tab, activeSpace, newName);
            }
          } else {
            await Utils.removeTabNameOverride(tab.id);
            if (isPinned) {
              await Utils.updateBookmarkTitleIfNeeded(tab, activeSpace, originalTitle);
            }
          }
        } catch (error) {
          console.error("Error getting tab info or saving override:", error);
        }
      }
      try {
        const potentiallyUpdatedTab = await chrome.tabs.get(tab.id);
        tab.title = potentiallyUpdatedTab.title;
        tab.url = potentiallyUpdatedTab.url;
      } catch (e) {
        console.log("Tab likely closed during edit, cannot update display.");
        return;
      }
      await updateDisplay();
    };
    titleInput.addEventListener("blur", () => saveOrCancelEdit(true));
    titleInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        await saveOrCancelEdit(true);
        titleInput.blur();
      } else if (e.key === "Escape") {
        await saveOrCancelEdit(false);
        titleInput.blur();
      }
    });
  }
  await updateDisplay();
  tabElement.addEventListener("click", async (e) => {
    if (e.target === titleInput || e.target === actionButton) return;
    document.querySelectorAll(".tab.active").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".pinned-favicon.active").forEach((t) => t.classList.remove("active"));
    let chromeTab = null;
    try {
      chromeTab = await chrome.tabs.get(tab.id);
    } catch (e2) {
      console.log("Tab likely closed during archival.", e2, tab);
    }
    if (isBookmarkOnly || !chromeTab) {
      console.log("Opening bookmark:", tab);
      isOpeningBookmark = true;
      try {
        const space = spaces.find((s) => s.id === activeSpaceId);
        if (!space) {
          console.error("Cannot open bookmark: Active space not found.");
          isOpeningBookmark = false;
          return;
        }
        const newTab = await chrome.tabs.create({
          url: tab.url,
          active: true,
          // Make it active immediately
          windowId: currentWindow.id
          // Ensure it opens in the current window
        });
        if (tab.title && newTab.title !== tab.title) {
          await Utils.setTabNameOverride(newTab.id, tab.url, tab.title);
        }
        const bookmarkTab = {
          id: newTab.id,
          title: tab.title,
          url: tab.url,
          favIconUrl: tab.favIconUrl,
          spaceName: tab.spaceName
        };
        const activeBookmark = await createTabElement(bookmarkTab, true, false);
        activeBookmark.classList.add("active");
        tabElement.replaceWith(activeBookmark);
        await chrome.tabs.group({ tabIds: [newTab.id], groupId: activeSpaceId });
        if (isPinned) {
          const space2 = spaces.find((s) => s.name === tab.spaceName);
          if (space2) {
            space2.spaceBookmarks.push(newTab.id);
            saveSpaces();
          }
        }
        saveSpaces();
        activateTabInDOM(newTab.id);
      } catch (error) {
        console.error("Error opening bookmark:", error);
      } finally {
        isOpeningBookmark = false;
      }
    } else {
      tabElement.classList.add("active");
      chrome.tabs.update(tab.id, { active: true });
      const space = spaces.find((s) => s.id === tab.groupId);
      if (space) {
        space.lastTab = tab.id;
        saveSpaces();
      }
    }
  });
  tabElement.addEventListener("mousedown", (event) => {
    if (event.button === MouseButton.MIDDLE) {
      event.preventDefault();
      closeTab(tabElement, tab, isPinned, isBookmarkOnly);
    }
  });
  if (!isBookmarkOnly) {
    tabElement.addEventListener("dragstart", () => {
      tabElement.classList.add("dragging");
    });
    tabElement.addEventListener("dragend", () => {
      tabElement.classList.remove("dragging");
    });
  }
  tabElement.addEventListener("contextmenu", async (e) => {
    e.preventDefault();
    const arcifyFolder = await LocalStorage.getOrCreateArcifyFolder();
    const allBookmarkSpaceFolders = await chrome.bookmarks.getChildren(arcifyFolder.id);
    showTabContextMenu(e.pageX, e.pageY, tab, isPinned, isBookmarkOnly, tabElement, closeTab, spaces, moveTabToSpace, setActiveSpace, allBookmarkSpaceFolders, createSpaceFromInactive);
  });
  return tabElement;
}
function createNewTab(callback = () => {
}) {
  console.log("Creating new tab...");
  chrome.tabs.create({ active: true }, async (tab) => {
    console.log("activeSpaceId", activeSpaceId);
    if (activeSpaceId) {
      await chrome.tabs.group({ tabIds: tab.id, groupId: activeSpaceId });
      const space = spaces.find((s) => s.id === activeSpaceId);
      if (space) {
        space.temporaryTabs.push(tab.id);
        saveSpaces();
        if (callback) {
          callback();
        }
      }
    }
  });
}
async function createNewSpace() {
  console.log("Creating new space... Button clicked");
  isCreatingSpace = true;
  try {
    const spaceNameInput = document.getElementById("newSpaceName");
    const spaceColorSelect = document.getElementById("spaceColor");
    const spaceName = spaceNameInput.value.trim();
    const spaceColor = spaceColorSelect.value;
    if (!spaceName || spaces.some((space2) => space2.name.toLowerCase() === spaceName.toLowerCase())) {
      const errorPopup = document.createElement("div");
      errorPopup.className = "error-popup";
      errorPopup.textContent = "A space with this name already exists";
      const inputContainer2 = document.getElementById("addSpaceInputContainer");
      inputContainer2.appendChild(errorPopup);
      setTimeout(() => {
        errorPopup.remove();
      }, 3e3);
      return;
    }
    const newTab = await ChromeHelper.createNewTab();
    const groupId = await ChromeHelper.createNewTabGroup(newTab, spaceName, spaceColor);
    const space = {
      id: groupId,
      uuid: Utils.generateUUID(),
      name: spaceName,
      color: spaceColor,
      spaceBookmarks: [],
      temporaryTabs: [newTab.id]
    };
    await LocalStorage.getOrCreateSpaceFolder(space.name);
    spaces.push(space);
    console.log("New space created:", { spaceId: space.id, spaceName: space.name, spaceColor: space.color });
    createSpaceElement(space);
    await updateSpaceSwitcher();
    await setActiveSpace(space.id);
    saveSpaces();
    isCreatingSpace = false;
    const addSpaceBtn2 = document.getElementById("addSpaceBtn");
    const inputContainer = document.getElementById("addSpaceInputContainer");
    const spaceSwitcher2 = document.getElementById("spaceSwitcher");
    addSpaceBtn2.classList.remove("active");
    inputContainer.classList.remove("visible");
    spaceSwitcher2.style.opacity = "1";
    spaceSwitcher2.style.visibility = "visible";
  } catch (error) {
    console.error("Error creating new space:", error);
  }
}
function cleanTemporaryTabs(spaceId) {
  console.log("Cleaning temporary tabs for space:", spaceId);
  const space = spaces.find((s) => s.id === spaceId);
  if (space) {
    console.log("space.temporaryTabs", space.temporaryTabs);
    space.temporaryTabs.forEach((tabId, index) => {
      if (index == space.temporaryTabs.length - 1) {
        createNewTab();
      }
      chrome.tabs.remove(tabId);
    });
    space.temporaryTabs = [];
    saveSpaces();
  }
}
function handleTabCreated(tab) {
  if (isCreatingSpace || isOpeningBookmark) {
    console.log("Skipping tab creation handler - space is being created");
    return;
  }
  chrome.windows.getCurrent({ populate: false }, async (currentWindow2) => {
    if (tab.windowId !== currentWindow2.id) {
      console.log("New tab is in a different window, ignoring...");
      return;
    }
    console.log("Tab created:", tab);
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        const space = spaces.find((s) => s.id === activeSpaceId);
        if (space) {
          await moveTabToSpace(tab.id, space.id, false, tab.openerTabId);
        }
      } catch (error) {
        console.error("Error handling new tab:", error);
      }
    });
  });
}
function handleTabUpdate(tabId, changeInfo, tab) {
  if (isOpeningBookmark) {
    return;
  }
  chrome.windows.getCurrent({ populate: false }, async (currentWindow2) => {
    if (tab.windowId !== currentWindow2.id) {
      console.log("New tab is in a different window, ignoring...");
      return;
    }
    console.log("Tab updated:", tabId, changeInfo, spaces);
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
      if (changeInfo.url || changeInfo.favIconUrl) {
        const img = tabElement.querySelector("img");
        if (img) {
          img.src = tab.favIconUrl;
          img.onerror = () => {
            img.src = tab.favIconUrl;
            img.onerror = () => {
              img.src = "assets/default_icon.png";
            };
          };
        }
      }
      const titleDisplay = tabElement.querySelector(".tab-title-display");
      const domainDisplay = tabElement.querySelector(".tab-domain-display");
      const titleInput = tabElement.querySelector(".tab-title-input");
      let displayTitle = tab.title;
      if (changeInfo.pinned !== void 0) {
        if (changeInfo.pinned) {
          const spaceWithTab = spaces.find(
            (space) => space.spaceBookmarks.includes(tabId) || space.temporaryTabs.includes(tabId)
          );
          if (spaceWithTab && spaceWithTab.spaceBookmarks.includes(tabId)) {
            const arcifyFolder = await LocalStorage.getOrCreateArcifyFolder();
            const spaceFolders = await chrome.bookmarks.getChildren(arcifyFolder.id);
            const spaceFolder = spaceFolders.find((f) => f.title === spaceWithTab.name);
            if (spaceFolder) {
              await Utils.searchAndRemoveBookmark(spaceFolder.id, tab.url);
            }
          }
          spaces.forEach((space) => {
            space.spaceBookmarks = space.spaceBookmarks.filter((id) => id !== tabId);
            space.temporaryTabs = space.temporaryTabs.filter((id) => id !== tabId);
          });
          saveSpaces();
          tabElement.remove();
        } else {
          moveTabToSpace(
            tabId,
            activeSpaceId,
            false
            /* pinned */
          );
        }
        updatePinnedFavicons();
      } else if (titleDisplay && domainDisplay && titleInput) {
        if (document.activeElement !== titleInput) {
          const overrides = await Utils.getTabNameOverrides();
          console.log("changeInfo", changeInfo);
          console.log("overrides", overrides);
          console.log("tab.url", tab.url);
          const override = overrides[tabId];
          console.log("override", override);
          let displayDomain = null;
          if (override) {
            displayTitle = override.name;
            try {
              const currentDomain = new URL(tab.url).hostname;
              if (currentDomain !== override.originalDomain) {
                displayDomain = currentDomain;
              }
            } catch (e) {
            }
          } else {
            titleDisplay.textContent = displayTitle;
          }
          if (displayDomain) {
            domainDisplay.textContent = displayDomain;
            domainDisplay.style.display = "block";
          } else {
            domainDisplay.style.display = "none";
          }
          titleInput.value = override ? override.name : tab.title;
        }
      }
      if (changeInfo.url) {
        tabElement.querySelector(".tab-favicon").src = Utils.getFaviconUrl(changeInfo.url);
        if (tabElement.closest('[data-tab-type="pinned"]')) {
          updateBookmarkForTab(tab, displayTitle);
        }
      }
      if (changeInfo.active !== void 0 && changeInfo.active) {
        activateTabInDOM(tabId);
      }
    }
  });
}
async function handleTabRemove(tabId) {
  console.log("Tab removed:", tabId);
  const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (!tabElement) return;
  console.log("tabElement", tabElement);
  const activeSpace = spaces.find((s) => s.id === activeSpaceId);
  console.log("activeSpace", activeSpace);
  const isPinned = activeSpace.spaceBookmarks.find((id) => id === tabId) != null;
  console.log("isPinned", isPinned);
  spaces.forEach((space) => {
    space.spaceBookmarks = space.spaceBookmarks.filter((id) => id !== tabId);
    space.temporaryTabs = space.temporaryTabs.filter((id) => id !== tabId);
  });
  if (!isPinned) {
    tabElement?.remove();
  }
  saveSpaces();
}
function handleTabActivated(activeInfo) {
  if (isCreatingSpace) {
    console.log("Skipping tab creation handler - space is being created");
    return;
  }
  chrome.windows.getCurrent({ populate: false }, async (currentWindow2) => {
    if (activeInfo.windowId !== currentWindow2.id) {
      console.log("New tab is in a different window, ignoring...");
      return;
    }
    console.log("Tab activated:", activeInfo);
    const spaceWithTab = spaces.find(
      (space) => space.spaceBookmarks.includes(activeInfo.tabId) || space.temporaryTabs.includes(activeInfo.tabId)
    );
    console.log("found space", spaceWithTab);
    if (spaceWithTab) {
      spaceWithTab.lastTab = activeInfo.tabId;
      saveSpaces();
      console.log("lasttab space", spaces);
    }
    if (spaceWithTab && spaceWithTab.id !== activeSpaceId) {
      await activateSpaceInDOM(spaceWithTab.id, spaces, updateSpaceSwitcher);
      activateTabInDOM(activeInfo.tabId);
    } else {
      activateTabInDOM(activeInfo.tabId);
    }
  });
}
async function deleteSpace(spaceId) {
  console.log("Deleting space:", spaceId);
  const space = spaces.find((s) => s.id === spaceId);
  if (space) {
    [...space.spaceBookmarks, ...space.temporaryTabs].forEach((tabId) => {
      chrome.tabs.remove(tabId);
    });
    spaces = spaces.filter((s) => s.id !== spaceId);
    const spaceElement = document.querySelector(`[data-space-id="${spaceId}"]`);
    if (spaceElement) {
      spaceElement.remove();
    }
    if (activeSpaceId === spaceId && spaces.length > 0) {
      await setActiveSpace(spaces[0].id);
    }
    const arcifyFolder = await LocalStorage.getOrCreateArcifyFolder();
    const spaceFolders = await chrome.bookmarks.getChildren(arcifyFolder.id);
    const spaceFolder = spaceFolders.find((f) => f.title === space.name);
    await chrome.bookmarks.removeTree(spaceFolder.id);
    saveSpaces();
    await updateSpaceSwitcher();
  }
}
async function moveTabToSpace(tabId, spaceId, pinned = false, openerTabId = null) {
  const sourceSpace = spaces.find(
    (s) => s.temporaryTabs.includes(tabId) || s.spaceBookmarks.includes(tabId)
  );
  if (sourceSpace && sourceSpace.id !== spaceId) {
    sourceSpace.temporaryTabs = sourceSpace.temporaryTabs.filter((id) => id !== tabId);
    sourceSpace.spaceBookmarks = sourceSpace.spaceBookmarks.filter((id) => id !== tabId);
  }
  const space = spaces.find((s) => s.id === spaceId);
  if (!space) {
    console.warn(`Space with ID ${spaceId} not found.`);
    return;
  }
  try {
    await chrome.tabs.group({ tabIds: tabId, groupId: spaceId });
  } catch (err) {
    console.warn(`Error grouping tab ${tabId} to space ${spaceId}:`, err);
  }
  space.spaceBookmarks = space.spaceBookmarks.filter((id) => id !== tabId);
  space.temporaryTabs = space.temporaryTabs.filter((id) => id !== tabId);
  if (pinned) {
    space.spaceBookmarks.push(tabId);
  } else {
    space.temporaryTabs.push(tabId);
  }
  const oldTabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
  oldTabElement?.remove();
  const spaceElement = document.querySelector(`[data-space-id="${spaceId}"]`);
  if (spaceElement) {
    const containerSelector = pinned ? '[data-tab-type="pinned"]' : '[data-tab-type="temporary"]';
    const container = spaceElement.querySelector(containerSelector);
    const chromeTab = await chrome.tabs.get(tabId);
    const tabElement = await createTabElement(chromeTab, pinned);
    if (container.children.length > 1) {
      if (openerTabId) {
        let tabs = container.querySelectorAll(`.tab`);
        const openerTabIndex = Array.from(tabs).findIndex((tab) => tab.dataset.tabId == openerTabId);
        if (openerTabIndex + 1 < tabs.length) {
          const tabToInsertBefore = tabs[openerTabIndex + 1];
          container.insertBefore(tabElement, tabToInsertBefore);
        } else {
          container.appendChild(tabElement);
        }
      } else {
        container.insertBefore(tabElement, container.firstChild);
      }
    } else {
      container.appendChild(tabElement);
    }
  }
  saveSpaces();
}
