
import { resolve, parse } from 'url'
import { BlacklistCtrlFunc } from './blacklist';

interface CleanupProps {
  baseURL?: string
  debug?: boolean
  isBacklisted?: BlacklistCtrlFunc
}

interface FilterFunc {
  (node: Element): Element | null
}

/**
 * Remove all blacklisted attributes from a HTML element.
 * @param blacklist the list of attributes to remove
 * @returns the filtering function
 */
export function removeAttributes(blacklist: string[]): FilterFunc {
  return function (node: Element) {
    blacklist.forEach(attr => node.hasAttribute(attr) && node.removeAttribute(attr))
    return node
  }
}

/**
 * Remove a image that can be a tracker (1px square).
 * @returns the filtering function
 */
export function removeImageTraker(): FilterFunc {
  return function (node: Element) {
    if (node.tagName !== 'IMG') {
      return node
    }
    if (node.hasAttribute('height') || node.hasAttribute('width')) {
      const height = node.getAttribute('height')
      const width = node.getAttribute('width')
      if (height === '1' && width === '1' && node.parentNode) {
        node.parentNode.removeChild(node)
        return null
      }
    }
    return node
  }
}

/**
 * Delete all HTML elements that refer to a blacklisted site.
 * @param isBlacklist function to control if the hostname is blacklisted
 * @returns the filtering function
 */
export function removeBlacklistedLinks(isBlacklisted: BlacklistCtrlFunc): FilterFunc {
  return function (node: Element) {
    const src = node.getAttribute('src') || node.getAttribute('href')
    if (src) {
      const hostname = parse(src).hostname || 'undefined'
      if (isBlacklisted(hostname) && node.parentNode) {
        node.parentNode.removeChild(node)
        return null
      }
    }
    return node
  }
}

/**
 * Update link to target new blank window.
 * @returns the filtering function
 */
export function externalizeLinks(): FilterFunc {
  return function (node: Element) {
    if (node.tagName !== 'A') {
      return node
    }
    if (node.hasAttribute('href')) {
      node.setAttribute('target', '_blank')
    }
    return node
  }
}

/**
 * Update relative link to be absolute.
 * @param baseURL the base URL used to make the link absolute
 * @returns the filtering function
 */
export function rebaseSrcAttribute(baseURL: string): FilterFunc {
  const absoluteUrlRe = new RegExp('^https?://')
  return function (node: Element) {
    let attr = node.hasAttribute('src') ? 'src' : node.hasAttribute('href') ? 'href' : null
    if (attr) {
      const src = node.getAttribute(attr)
      if (src && !absoluteUrlRe.test(src)) {
        node.setAttribute(attr, resolve(baseURL, src))
      }
    }
    return node
  }
}

/**
 * Move attribute to another.
 * @param attr1 source attribute to remove
 * @param attr2 target attribute
 * @returns the filtering function
 */
export function moveAttribute(attr1: string, attr2: string): FilterFunc {
  return function (node: Element) {
    if (node.hasAttribute(attr1)) {
      const val1 = node.getAttribute(attr1)
      const val2 = node.getAttribute(attr2) || ''
      node.setAttribute(attr2, val1 || val2)
      node.removeAttribute(attr1)
    }
    return node
  }
}

const DefaultFilterChain = [
  removeAttributes(['id', 'class']),
  removeImageTraker(),
  externalizeLinks(),
  // moveAttribute('data-src', 'src')
]

/**
 * Clean a DOM using a filter chain.
 * @param doc DOM to clean
 * @param props properties used by filters
 * @param filters chain filter
 */
export function clean(doc: Document, props: CleanupProps, filters: FilterFunc[] = DefaultFilterChain) {
  if (props.baseURL) {
    filters.push(rebaseSrcAttribute(props.baseURL))
  }
  if (props.isBacklisted) {
    filters = [removeBlacklistedLinks(props.isBacklisted), ...filters]
  }
  const $nodes = Array.from(doc.getElementsByTagName('*'))
  $nodes.forEach(($node: Element) => {
    if ($node.tagName.match(/HTML|HEAD|BODY|META|LINK|STYLE/)) {
      return
    }
    if (props.debug) {
      console.log(`[DEBUG] - HTML Element: ${$node.outerHTML}`)
    }
    for (const filter of filters) {
      const $n = filter($node)
      if (!$n) {
        if (props.debug) {
          console.log(`[DEBUG] - HTML Element removed: ${$node.outerHTML}`)
        }
        break
      }
      $node = $n
    }
    if (props.debug && $node) {
      console.log(`[DEBUG] - Cleaned HTML Element: ${$node.outerHTML}`)
    }
  });
}
