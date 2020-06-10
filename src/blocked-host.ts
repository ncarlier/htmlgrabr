export type BlockedHostCtrlFunc = (hostname: string) => boolean

const db = new Set(['doubleclick.net', 'feeds.feedburner.com'])

export const isBlockedHost: BlockedHostCtrlFunc = (hostname: string) => db.has(hostname)
