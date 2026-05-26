import { filesystemTools } from "../../lib/tools/filesystem-tools.js";

const ACCESS_SCOPE = "all";

// Read-only subset only: no write or cd, so stateless queries never mutate the
// shared filesystem or working directory.
export const retrievalTools = {
  cat: filesystemTools.cat(ACCESS_SCOPE),
  ls: filesystemTools.ls(ACCESS_SCOPE),
  find: filesystemTools.find(ACCESS_SCOPE),
  grep: filesystemTools.grep(ACCESS_SCOPE),
};
