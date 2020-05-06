export interface BlacklistCtrlFunc {
  (hostname: string): boolean;
}

const db = new Set(["doubleclick.net", "feeds.feedburner.com"]);

export function isBlacklisted(hostname: string) {
  return db.has(hostname);
}
