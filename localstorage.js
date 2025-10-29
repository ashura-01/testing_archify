const LocalStorage = {
  getOrCreateArcifyFolder: async function() {
    let [folder] = await chrome.bookmarks.search({ title: "Arcify" });
    if (!folder) {
      folder = await chrome.bookmarks.create({ title: "Arcify" });
    }
    return folder;
  },
  getOrCreateSpaceFolder: async function(spaceName) {
    const arcifyFolder = await this.getOrCreateArcifyFolder();
    const children = await chrome.bookmarks.getChildren(arcifyFolder.id);
    let spaceFolder = children.find((f) => f.title === spaceName);
    if (!spaceFolder) {
      spaceFolder = await chrome.bookmarks.create({
        parentId: arcifyFolder.id,
        title: spaceName
      });
    }
    return spaceFolder;
  },
  // --- Recursive Helper Function to Merge Contents ---
  _mergeFolderContentsRecursive: async function(sourceFolderId, targetFolderId) {
    console.log(`Recursively merging contents from ${sourceFolderId} into ${targetFolderId}`);
    try {
      const sourceChildren = await chrome.bookmarks.getChildren(sourceFolderId);
      const targetChildren = await chrome.bookmarks.getChildren(targetFolderId);
      for (const sourceItem of sourceChildren) {
        if (sourceItem.url) {
          const existsInTarget = targetChildren.some((targetItem) => targetItem.url === sourceItem.url);
          if (!existsInTarget) {
            console.log(`Moving bookmark "${sourceItem.title}" (${sourceItem.id}) to ${targetFolderId}`);
            await chrome.bookmarks.move(sourceItem.id, { parentId: targetFolderId });
          } else {
            console.log(`Bookmark "${sourceItem.title}" (${sourceItem.id}) already exists in target ${targetFolderId}, removing source.`);
            await chrome.bookmarks.remove(sourceItem.id);
          }
        } else {
          const existingTargetSubfolder = targetChildren.find((targetItem) => !targetItem.url && targetItem.title === sourceItem.title);
          if (existingTargetSubfolder) {
            console.log(`Subfolder "${sourceItem.title}" exists in target. Merging subfolder ${sourceItem.id} into ${existingTargetSubfolder.id}`);
            await this._mergeFolderContentsRecursive(sourceItem.id, existingTargetSubfolder.id);
            console.log(`Removing merged source subfolder "${sourceItem.title}" (${sourceItem.id})`);
            await chrome.bookmarks.remove(sourceItem.id);
          } else {
            console.log(`Moving nested folder "${sourceItem.title}" (${sourceItem.id}) to ${targetFolderId}`);
            await chrome.bookmarks.move(sourceItem.id, { parentId: targetFolderId });
          }
        }
      }
    } catch (error) {
      console.error(`Error merging contents from ${sourceFolderId} to ${targetFolderId}:`, error);
    }
  },
  // --- Updated Function to Merge Duplicate Space Folders ---
  mergeDuplicateSpaceFolders: async function() {
    console.log("Checking for duplicate space folders...");
    try {
      const [arcifyFolder] = await chrome.bookmarks.search({ title: "Arcify" });
      if (!arcifyFolder) {
        console.log("Arcify folder not found.");
        return;
      }
      const children = await chrome.bookmarks.getChildren(arcifyFolder.id);
      const folders = children.filter((item) => !item.url);
      const folderGroups = /* @__PURE__ */ new Map();
      folders.forEach((folder) => {
        const name = folder.title;
        if (!folderGroups.has(name)) {
          folderGroups.set(name, []);
        }
        folderGroups.get(name).push(folder);
      });
      for (const [name, group] of folderGroups.entries()) {
        if (group.length > 1) {
          console.log(`Found ${group.length} folders named "${name}". Merging...`);
          group.sort((a, b) => a.dateAdded - b.dateAdded);
          const targetFolder = group[0];
          for (let i = 1; i < group.length; i++) {
            const sourceFolder = group[i];
            console.log(`Merging duplicate folder ID ${sourceFolder.id} ("${sourceFolder.title}") into target ${targetFolder.id}`);
            try {
              await this._mergeFolderContentsRecursive(sourceFolder.id, targetFolder.id);
              const remainingChildren = await chrome.bookmarks.getChildren(sourceFolder.id);
              if (remainingChildren.length === 0) {
                console.log(`Removing empty source folder "${sourceFolder.title}" (ID: ${sourceFolder.id})`);
                await chrome.bookmarks.remove(sourceFolder.id);
              } else {
                console.warn(`Source folder ${sourceFolder.id} ("${sourceFolder.title}") not empty after merge attempt, attempting removal anyway or investigate.`);
                await chrome.bookmarks.remove(sourceFolder.id);
              }
            } catch (mergeError) {
              console.error(`Error during top-level merge of folder ${sourceFolder.id} into ${targetFolder.id}:`, mergeError);
            }
          }
          console.log(`Finished merging folders named "${name}".`);
        }
      }
      console.log("Duplicate folder check complete.");
    } catch (error) {
      console.error("Error during duplicate space folder merge process:", error);
    }
  },
  // --- End of Updated Function ---
  // Helper function to generate UUID
  generateUUID: function() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
};
export {
  LocalStorage as L
};
