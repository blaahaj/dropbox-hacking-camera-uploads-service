import { Mover } from "@blaahaj/dropbox-hacking-mover";
import {
  DropboxProvider,
  getDropboxClient,
  getGlobalOptions,
  GlobalOptions,
  GlobalOptionsSingleton,
  retrier,
} from "@blaahaj/dropbox-hacking-util";
import { tidy } from "./tidy.js";
import { move } from "./move.js";

const CAMERA_UPLOADS = "/Camera Uploads";

// type FileMetadataWithPath = FileMetadata & { path_lower: string; path_display: string };
// type FolderMetadataWithPath = FolderMetadata & { path_lower: string; path_display: string };
// const fileHasPath = (item: FileMetadata): item is FileMetadataWithPath => !!item.path_lower && !!item.path_display;
// const folderHasPath = (item: FolderMetadata): item is FileMetadataWithPath => !!item.path_lower && !!item.path_display;

const main = async (args: {
  dbxp: DropboxProvider;
  globalOptions: GlobalOptions;
  dryRun: boolean;
  tail: boolean;
  tidy: boolean;
}) => {
  const cameraUploadsPath = CAMERA_UPLOADS;

  const dbx = await args.dbxp();

  if (args.tidy) {
    await tidy({ dbx, globalOptions, cameraUploadsPath });
  } else {
    const mover = new Mover(dbx, args.globalOptions);

    let shutdownPromise = Promise.resolve();
    const shutdownWaitsFor = (p: Promise<unknown>): void => {
      shutdownPromise = Promise.all([
        shutdownPromise,
        p.catch(() => undefined),
      ]).then(() => undefined);
    };

    await move({
      dbx,
      globalOptions,
      cameraUploadsPath,
      dryRun: args.dryRun,
      mover,
      tail: args.tail,
      shutdownWaitsFor,
    });

    await shutdownPromise;
  }

  process.exit(0);
};

const { globalOptions } = getGlobalOptions(process.argv.slice(2));
GlobalOptionsSingleton.set(globalOptions);

const dbxp = () =>
  getDropboxClient().then((dbx) => retrier(dbx, globalOptions));

main({
  dbxp,
  globalOptions,
  dryRun: !!process.env.DRY_RUN,
  tail: !!process.env.TAIL,
  tidy: !!process.env.TIDY,
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
