import { lister } from "@blaahaj/dropbox-hacking-lister";
import { tryMove } from "./tryMove.js";
import type { Dropbox } from "dropbox";
import { targetForRemoteFile } from "./targetForFile.js";
import type { Mover } from "@blaahaj/dropbox-hacking-mover";
import type { GlobalOptions } from "@blaahaj/dropbox-hacking-util";

export const move = async (args: {
  dbx: Dropbox;
  mover: Mover;
  tail: boolean;
  cameraUploadsPath: string;
  dryRun: boolean;
  shutdownWaitsFor: (p: Promise<unknown>) => void;
  globalOptions: GlobalOptions;
}) => {
  const {
    dbx,
    mover,
    tail,
    cameraUploadsPath,
    dryRun,
    shutdownWaitsFor,
    globalOptions,
  } = args;

  await lister({
    dbx,
    listing: {
      tag: "from_start",
      args: { path: cameraUploadsPath, recursive: true },
      tail,
    },
    onItem: async (item) => {
      // console.log("Got item from lister:", JSON.stringify(item));

      if (item[".tag"] === "file" && item.path_lower && item.path_display) {
        const wantedPath = targetForRemoteFile(item);
        // console.log({ item, wantedPath });
        if (wantedPath && wantedPath.toLowerCase() !== item.path_lower)
          return shutdownWaitsFor(
            tryMove({ dbx, mover, item, wantedPath, dryRun, shutdownWaitsFor }),
          );
        else if (!wantedPath) {
          console.warn(`No 'wanted' path for ${item.path_display}`);
        }
      }

      return Promise.resolve();
    },
    // onCursor: async (cursor) => {
    //   console.log({ cursor });
    // },
    onPause: async () => {
      console.log("pause");
    },
    onResume: async () => console.log("resume"),
    globalOptions,
  }).promise;
};
