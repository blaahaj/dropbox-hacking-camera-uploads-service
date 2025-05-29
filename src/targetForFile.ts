import type { files } from "dropbox";
import path from "node:path";

const picsExts = new Set([".jpg", ".png", ".heic", ".dng", ".cr3", ".webp"]);
const videosExts = new Set([".mov", ".mp4", ".srt"]);

export const targetForRemoteFile = (
  item: files.FileMetadata,
): string | undefined => {
  if (item.path_display === undefined) return undefined;
  if (item.path_lower === undefined) return undefined;
  if (item.content_hash === undefined) return undefined;

  return targetForFile(item.name, item.content_hash, item.client_modified);
};

export const targetForFile = (
  basename: string,
  contentHash: string,
  clientModified: string,
): string | undefined => {
  const yyyy = clientModified.substring(0, 4);
  const yyyymm = clientModified.substring(0, 7);
  const yyyymmdd = clientModified.substring(0, 10);

  const ext = path.extname(basename);

  let nameWithHash = basename;
  if (!nameWithHash.toLowerCase().endsWith(`.${contentHash}${ext}`)) {
    nameWithHash = `${path.basename(basename, ext)}.${contentHash}${ext}`;
  }

  if (picsExts.has(ext.toLowerCase())) {
    return `/pics/camera/sliced/${yyyy}/${yyyymm}/${yyyymmdd}/${nameWithHash}`;
  }

  if (videosExts.has(ext.toLowerCase())) {
    return `/pics/videos/sliced/${yyyy}/${yyyymm}/${yyyymmdd}/${nameWithHash}`;
  }

  return undefined;
};
