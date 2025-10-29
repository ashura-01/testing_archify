import { U as Utils } from "./utils.js";
import "./localstorage.js";
async function saveOptions() {
  const defaultSpaceName = document.getElementById("defaultSpaceName").value;
  const autoArchiveEnabledCheckbox = document.getElementById("autoArchiveEnabled");
  const autoArchiveIdleMinutesInput = document.getElementById("autoArchiveIdleMinutes");
  const settings = {
    defaultSpaceName: defaultSpaceName || "Home",
    // Default to 'Home' if empty
    autoArchiveEnabled: autoArchiveEnabledCheckbox.checked,
    autoArchiveIdleMinutes: parseInt(autoArchiveIdleMinutesInput.value, 10) || 30
  };
  try {
    await chrome.storage.sync.set(settings);
    console.log("Settings saved:", settings);
    await chrome.runtime.sendMessage({ action: "updateAutoArchiveSettings" });
    const status = document.getElementById("status");
    console.log("Status:", status);
    status.textContent = "Options saved.";
    setTimeout(() => {
      status.textContent = "";
    }, 2e3);
  } catch (error) {
    console.error("Error saving settings:", error);
  }
}
async function restoreOptions() {
  const settings = await Utils.getSettings();
  const defaultSpaceName = document.getElementById("defaultSpaceName");
  const autoArchiveEnabledCheckbox = document.getElementById("autoArchiveEnabled");
  const autoArchiveIdleMinutesInput = document.getElementById("autoArchiveIdleMinutes");
  defaultSpaceName.value = settings.defaultSpaceName;
  autoArchiveEnabledCheckbox.checked = settings.autoArchiveEnabled;
  autoArchiveIdleMinutesInput.value = settings.autoArchiveIdleMinutes;
}
document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);
