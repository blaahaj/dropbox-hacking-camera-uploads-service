import { lister } from "@blaahaj/dropbox-hacking-lister";
import type { GlobalOptions } from "@blaahaj/dropbox-hacking-util";
import type { Dropbox, files } from "dropbox";

type WithPath = { path_lower: string; path_display: string };
const hasPath = <T extends { path_lower?: string; path_display?: string }>(
  item: T,
): item is T & WithPath => !!item.path_lower && !!item.path_display;

// Deletes known-unwanted files and empty directories under `cameraUploadsPath`

export const tidy = async (args: {
  dbx: Dropbox;
  globalOptions: GlobalOptions;
  cameraUploadsPath: string;
}) => {
  const { dbx, globalOptions, cameraUploadsPath } = args;

  const fileItems: (files.FileMetadata & WithPath)[] = [];
  const folderItems: (files.FolderMetadata & WithPath)[] = [];

  await lister({
    dbx,
    listing: {
      tag: "from_start",
      args: { path: cameraUploadsPath, recursive: true },
      tail: false,
    },
    onItem: (item) => {
      if (item[".tag"] === "file" && hasPath(item)) fileItems.push(item);
      if (item[".tag"] === "folder" && hasPath(item)) folderItems.push(item);
      return Promise.resolve();
    },
    globalOptions,
  }).promise;

  const paths = new Set<string>();
  fileItems.forEach((item) => paths.add(item.path_lower));
  folderItems.forEach((item) => paths.add(item.path_lower));

  const shouldDeleteFile = (file: files.FileMetadata & WithPath): boolean =>
    file.path_lower.endsWith(".ctg") ||
    file.name.toLowerCase() === "fseventsd-uuid" ||
    file.name.toLowerCase() === ".trashes";

  await Promise.all(
    fileItems
      .filter(shouldDeleteFile)
      .map((item) =>
        dbx
          .filesDeleteV2({ path: item.path_lower })
          .then(() => paths.delete(item.path_lower)),
      ),
  );

  console.log([...paths.values()].sort().join("\n"));

  folderItems.sort((a, b) => a.path_lower.localeCompare(b.path_lower));
  folderItems.shift(); // The Camera Uploads folder itself

  const hasChild = (parentPath: string): boolean => {
    for (const childPath of paths) {
      if (childPath.startsWith(parentPath + "/")) return true;
    }

    return false;
  };

  for (const item of [...folderItems].reverse()) {
    if (!hasChild(item.path_lower)) {
      console.log(`rmdir ${item.path_lower}`);
      await dbx.filesDeleteV2({ path: item.path_lower });
      paths.delete(item.path_lower);
    }
  }
};
