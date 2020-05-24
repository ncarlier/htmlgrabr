import { JSDOM } from 'jsdom'
import Readability from 'mozilla-readability'
import fetch, { Headers, Request } from 'node-fetch'
import pretty from 'pretty'
import { URL } from 'url'

import { BlacklistCtrlFunc, isBlacklisted as defaultIsBlacklisted } from './blacklist'
import { extractBaseUrl, extractImages, extractOpenGraphProps, ImageMeta, isElementNode } from './helpers'
import { sanitize, URLRewriterFunc } from './sanitize'
import { DefaultRules, Rule } from './rules'

interface GrabberConfig {
  readonly debug?: boolean
  readonly pretty?: boolean
  readonly isBlacklisted?: BlacklistCtrlFunc
  readonly rewriteURL?: URLRewriterFunc
  readonly rules?: Map<string, Rule>
  readonly headers?: Headers
}

interface GrabbedPage {
  readonly title: string
  readonly url: string | null
  readonly image: string | null
  readonly html: string
  readonly text: string
  readonly excerpt: string
  readonly length: number
  readonly images: ImageMeta[]
}

const DefaultConfig: GrabberConfig = {
  debug: false,
  pretty: false,
  headers: new Headers({
    'User-Agent': 'Mozilla/5.0 (compatible; HTMLGrabr/1.0)',
  }),
  rules: DefaultRules,
  isBlacklisted: defaultIsBlacklisted,
}

export class HTMLGrabr {
  public readonly config: GrabberConfig

  constructor(config: GrabberConfig = {}) {
    this.config = { ...DefaultConfig, ...config }
  }

  /**
   * Grabs the content of a page from HTML content.
   * @param content a string that contains HTML code
   * @param baseURL a string that contains HTML base URL
   * @returns a page object
   */
  public async grab(content: string, baseURLFallback?: string): Promise<GrabbedPage> {
    const { debug, isBlacklisted, rewriteURL } = this.config

    // Load content into a virtual DOM
    const dom = new JSDOM(content, {
      url: baseURLFallback,
    })
    const doc = dom.window.document

    // Apply rule if exists
    if (baseURLFallback) {
      const { hostname } = new URL(baseURLFallback)
      const redirect = this.applyRules(hostname.replace(/^(www\.)/,""), doc)
      if (redirect) {
        return this.grabUrl(redirect)
      }
    }

    // Extract base URL
    const baseURL = extractBaseUrl(doc) || baseURLFallback

    // Extract Open Graph properties
    const ogProps = extractOpenGraphProps(doc)

    // Extract images
    const images = extractImages(doc, ogProps.image)

    // Use Readability.js to extract HTML content
    const reader = new Readability(doc, { debug })
    const article = reader.parse()
    if (debug) {
      console.log('article after Readability parsing:', article)
    }

    // Sanitize content
    let html = sanitize(article.content, { baseURL, debug, isBlacklisted, rewriteURL })
    if (debug) {
      console.log('HTML content after sanitization:', html)
    }

    if (this.config.pretty) {
      html = pretty(html, { ocd: true })
    }

    return {
      title: ogProps.title || article.title,
      url: ogProps.url || baseURL,
      image: ogProps.image,
      html,
      text: article.textContent,
      excerpt: article.excerpt,
      length: article.length,
      images,
    }
  }

  /**
   * Grabs the content of a remote HTML page.
   * @param url the URL to fetch and process
   * @returns a page object
   */
  public async grabUrl(url: URL): Promise<GrabbedPage> {
    let req = new Request(url.toString(), {
      headers: this.config.headers,
      method: 'HEAD'
    })

    let res = await fetch(req)
    if (!res.ok) {
      throw new Error(`bad status response: ${res.statusText}`)
    }
    const contentType = res.headers.get('Content-Type')
    if (!contentType.startsWith('text/html')) {
      throw new Error(`unsupported content type: ${contentType}`)
    }
    req = new Request(url.toString(), {
      headers: this.config.headers,
    })
    res = await fetch(req)
    if (!res.ok) {
      throw new Error(`bad status response: ${res.statusText}`)
    }
    const body = await res.text()
    return this.grab(body, url.toString())
  }

  private applyRules(hostname: string, doc: Document): URL | null {
    if (!this.config.rules.has(hostname)) {
      return null
    }
    const rule = this.config.rules.get(hostname)
    const node = doc.querySelector(rule.selector)
    if (node && isElementNode(node)) {
      if (rule.type === 'redirect' && (node.hasAttribute('src') || node.hasAttribute('href'))) {
        const src = node.getAttribute('src') || node.getAttribute('href')
        return new URL(src)
      } else {
        doc.body.childNodes.forEach((n) => n.remove())
        doc.body.prepend(node)
      }
    }
    return null
  }
}

export default HTMLGrabr
