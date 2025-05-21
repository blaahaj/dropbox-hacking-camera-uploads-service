import { Mover } from "@blaahaj/dropbox-hacking-mover";
import {
  DropboxProvider,
  GlobalOptions,
  processOptions,
} from "@blaahaj/dropbox-hacking-util";
import { tidy as doTidy } from "./tidy.js";
import { move } from "./move.js";
import {
  runAsMain,
  type Handler,
  type Operation,
} from "@blaahaj/dropbox-hacking-util/cli";

const verb = "process-camera-uploads";
const CAMERA_UPLOADS = "/Camera Uploads";

const TIDY = "--tidy";
const TAIL = "--tail";
const DRY_RUN = "--dry-run";

// type FileMetadataWithPath = FileMetadata & { path_lower: string; path_display: string };
// type FolderMetadataWithPath = FolderMetadata & { path_lower: string; path_display: string };
// const fileHasPath = (item: FileMetadata): item is FileMetadataWithPath => !!item.path_lower && !!item.path_display;
// const folderHasPath = (item: FolderMetadata): item is FileMetadataWithPath => !!item.path_lower && !!item.path_display;

const handler: Handler = async (
  dbxp: DropboxProvider,
  argv: string[],
  globalOptions: GlobalOptions,
  usageFail: () => Promise<void>,
) => {
  let tidy = false;
  let tail = false;
  let dryRun = false;

  argv = processOptions(argv, {
    [TIDY]: () => (tidy = true),
    [TAIL]: () => (tail = true),
    [DRY_RUN]: () => (dryRun = true),
  });

  if (argv.length > 1) void usageFail();

  const cameraUploadsPath = argv[0] || CAMERA_UPLOADS;

  const dbx = await dbxp();

  if (tidy) {
    await doTidy({ dbx, globalOptions, cameraUploadsPath });
  } else {
    const mover = new Mover(dbx, globalOptions);

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
      dryRun,
      mover,
      tail,
      shutdownWaitsFor,
    });

    await shutdownPromise;
  }

  process.exit(0);
};

const argsHelp = [
  `${verb} [${TIDY}] [${DRY_RUN}] [${TAIL}] [CAMERA_UPLOADS_DIR]`,
];

const op: Operation = {
  handler,
  verb,
  argsHelp,
};

runAsMain(op);
