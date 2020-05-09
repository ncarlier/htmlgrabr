export type BlacklistCtrlFunc = (hostname: string) => boolean

const db = new Set(['doubleclick.net', 'feeds.feedburner.com'])

export const isBlacklisted: BlacklistCtrlFunc = (hostname: string) => db.has(hostname)
