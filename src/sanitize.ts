import createDOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'
import { parse, resolve } from 'url'

import { BlockedHostCtrlFunc } from './blocked-host'
import { isElementNode } from './helpers'

export type URLRewriterFunc = (url: string) => string

export type FilterFunc = (currentNode: Element, event: DOMPurify.HookEvent, config: DOMPurify.Config) => void

interface CleanupProps {
  readonly baseURL?: string
  readonly debug?: boolean
  readonly isBlockedHost?: BlockedHostCtrlFunc
  readonly rewriteURL?: URLRewriterFunc
  readonly filters?: readonly FilterFunc[]
}

/**
 * Remove all blacklisted attributes from a HTML element.
 * @param blacklist the list of attributes to remove
 * @returns the filtering function
 */
function removeAttributes(blacklist: readonly string[]): FilterFunc {
  return (node) => {
    if (isElementNode(node)) {
      blacklist.forEach((attr) => node.hasAttribute(attr) && node.removeAttribute(attr))
    }
  }
}

/**
 * Remove a image that can be a tracker (1px square).
 * @returns the filtering function
 */
function removeImageTracker(): FilterFunc {
  return (node) => {
    if (node.tagName === 'IMG' && (node.hasAttribute('height') || node.hasAttribute('width'))) {
      const height = node.getAttribute('height')
      const width = node.getAttribute('width')
      if (height === '1' && width === '1' && node.parentNode) {
        node.parentNode.removeChild(node)
      }
    }
  }
}

/**
 * Delete all HTML elements that refer to a blocked host.
 * @param isBlockedHost function to control if the hostname is blocked
 * @returns the filtering function
 */
function removeBlockedHostLinks(isBlockedHost: BlockedHostCtrlFunc): FilterFunc {
  return (node) => {
    if (isElementNode(node) && (node.hasAttribute('src') || node.hasAttribute('href'))) {
      const src = node.getAttribute('src') || node.getAttribute('href')
      if (src) {
        const hostname = parse(src).hostname || 'undefined'
        if (isBlockedHost(hostname) && node.parentNode) {
          node.parentNode.removeChild(node)
        }
      }
    }
  }
}

/**
 * Update link to target new blank window.
 * @returns the filtering function
 */
function externalizeLinks(): FilterFunc {
  return (node) => {
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  }
}

/**
 * Update relative link to be absolute.
 * @param baseURL the base URL used to make the link absolute
 * @returns the filtering function
 */
function rebaseSrcAttribute(baseURL: string): FilterFunc {
  const absoluteUrlRe = new RegExp('^https?://')
  return (node) => {
    if (isElementNode(node)) {
      const attr = node.hasAttribute('src') ? 'src' : node.hasAttribute('href') ? 'href' : null
      if (attr) {
        const src = node.getAttribute(attr)
        if (src && !absoluteUrlRe.test(src)) {
          node.setAttribute(attr, resolve(baseURL, src))
        }
      }
    }
  }
}

function addLazyLoadingAttribute(): FilterFunc {
  return (node) => {
    if (node.nodeName === 'IFRAME' || node.nodeName === 'IMG') {
      node.setAttribute('loading', 'lazy')
    }
  }
}

function rewriteSrcAttribute(rewriteURL: URLRewriterFunc): FilterFunc {
  return (node) => {
    if (isElementNode(node) && node.hasAttribute('src')) {
      const value = node.getAttribute('src')
      if (value) {
        node.setAttribute('src', rewriteURL(value))
      }
    }
  }
}

const DefaultFilterChain: ReadonlyArray<any> = [
  removeAttributes(['id', 'class']),
  removeImageTracker(),
  externalizeLinks(),
  addLazyLoadingAttribute(),
]

/**
 * Clean a DOM using a filter chain.
 * @param doc DOM to clean
 * @param props properties used by filters
 * @param filters chain filter
 */
export function sanitize(html: string, props: CleanupProps): string {
  const window = new JSDOM('<!DOCTYPE html>').window as unknown
  const purify = createDOMPurify(window as Window) as DOMPurify.DOMPurifyI

  let filters = [...DefaultFilterChain, props.filters]
  if (props.baseURL) {
    filters.push(rebaseSrcAttribute(props.baseURL))
  }
  if (props.isBlockedHost) {
    filters = [removeBlockedHostLinks(props.isBlockedHost), ...filters]
  }
  if (props.rewriteURL) {
    filters = [rewriteSrcAttribute(props.rewriteURL), ...filters]
  }

  filters.forEach((filter) => purify.addHook('beforeSanitizeElements', filter))
  return purify.sanitize(html, {
    ADD_ATTR: ['target'],
  })
}
