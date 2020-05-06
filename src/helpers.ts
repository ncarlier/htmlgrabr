import * as mime from 'mime-types'
import { URL } from 'url'

const isValidUrl = (url: string) => {
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

/**
 * Returns true if the HTML node is an element.
 * @param node HTML node
 */
export const isElementNode = (node: Element) => node.nodeType == 1

/**
 * Extract base URL from headers of a DOM.
 * @param doc DOM to process
 * @returns the base URL
 */
export function extractBaseUrl(doc: Document): string | null {
  let result = null
  if (!doc.head) {
    return result
  }
  const $base = doc.head.getElementsByTagName('base')[0]
  if ($base && $base.hasAttribute('href')) {
    let baseUrl = $base.getAttribute('href') || ''
    if (/^\/\//i.test(baseUrl)) {
      baseUrl = 'http:' + baseUrl
    }
    if (isValidUrl(baseUrl)) {
      result = baseUrl
    }
  }
  return result
}

interface OpenGraphProps {
  [key: string]: any
}

/**
 * Extract Open Graph properties from headers of a DOM.
 * @param doc DOM to process
 * @returns Open Graph properties
 */
export function extractOpenGraphProps(doc: Document): OpenGraphProps {
  const result: OpenGraphProps = {}
  if (!doc.head) {
    return result
  }
  const $metas = Array.from(doc.head.getElementsByTagName('meta'))
  for (const $meta of $metas) {
    const attr = $meta.getAttribute('property')
    if (attr !== null && attr.startsWith('og:')) {
      const prop = attr.substr(3)
      result[prop] = $meta.getAttribute('content')
    }
    if (!isValidUrl(result.url)) {
      result.url = null
    }
  }
  return result
}

export interface ImageMeta {
  src: string
  contentType: string | null
}

/**
 * Extract all images from a DOM.
 * @param doc DOM to process
 * @param illustration if provided, the illustration is added to the result
 * @returns array of image meta data
 */
export function extractImages(doc: Document, illustration?: string): ImageMeta[] {
  const result: ImageMeta[] = []
  if (illustration) {
    // Add document Open Graph illustration in first position
    // This in order to be the document illustration.
    result.push({
      src: illustration,
      contentType: mime.lookup(illustration) || '',
    })
  }
  const $images = Array.from(doc.getElementsByTagName('img'))
  for (const $img of $images) {
    if ($img.hasAttribute('src')) {
      const src = $img.getAttribute('src')
      if (src && !/^data:/i.test(src)) {
        result.push({
          src,
          contentType: mime.lookup(src) || '',
        })
      }
    }
  }
  return result
}
