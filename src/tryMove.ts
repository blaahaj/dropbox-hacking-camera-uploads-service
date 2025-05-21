import type { Mover } from "@blaahaj/dropbox-hacking-mover";
import type { Dropbox, DropboxResponseError, files } from "dropbox";

export const tryMove = async (args: {
  dbx: Dropbox;
  mover: Mover;
  item: files.FileMetadata;
  wantedPath: string;
  dryRun: boolean;
  shutdownWaitsFor: (p: Promise<unknown>) => void;
}): Promise<void> => {
  const { dbx, mover, item, wantedPath, dryRun, shutdownWaitsFor } = args;

  if (!item.path_display) return;

  const existing = await dbx.filesGetMetadata({ path: wantedPath }).then(
    (r) => r.result,
    (err: DropboxResponseError<{ error: files.GetMetadataError }>) => {
      if (
        err.status === 409 &&
        err.error.error[".tag"] === "path" &&
        err.error.error.path[".tag"] === "not_found"
      ) {
        return undefined;
      }

      console.log(JSON.stringify({ get_existing: err }));
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw err;
    },
  );

  // console.log(` == ${JSON.stringify(existing)}`);

  if (existing === undefined) {
    console.log(`  want: ${item.path_display} -> ${wantedPath}`);

    if (!dryRun) {
      return mover
        .submit({
          from_path: item.path_display,
          to_path: wantedPath,
        })
        .then(() => {
          console.log(`  done: ${item.path_display} -> ${wantedPath}`);
        });
    }
  } else {
    console.log(`  declining to move because the target exists:`);
    console.log(`  ${JSON.stringify(existing)}`);

    if (existing[".tag"] === "file") {
      if (existing.content_hash === item.content_hash) {
        if (existing.client_modified === item.client_modified) {
          console.log(`  identical - will remove source`);
          if (!dryRun) {
            shutdownWaitsFor(
              dbx.filesDeleteV2({ path: item.id }).catch(() => undefined),
            );
          }
        } else {
          console.log(`  mismatching mtimes`);
        }
      } else {
        console.log(`  different content`);
      }
    } else {
      console.log(`  file/dir mismatch`);
    }
  }
};
