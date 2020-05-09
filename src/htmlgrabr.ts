import { JSDOM } from 'jsdom'
import Readability from 'mozilla-readability'
import fetch, { Headers, Request } from 'node-fetch'
import pretty from 'pretty'
import { URL } from 'url'

import { BlacklistCtrlFunc, isBlacklisted as defaultIsBlacklisted } from './blacklist'
import { extractBaseUrl, extractImages, extractOpenGraphProps, ImageMeta } from './helpers'
import { sanitize, URLRewriterFunc } from './sanitize'

interface GrabberConfig {
  readonly debug?: boolean
  readonly pretty?: boolean
  readonly isBlacklisted?: BlacklistCtrlFunc
  readonly rewriteURL?: URLRewriterFunc
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

    // Load sanitized content into a virtual DOM
    const dom = new JSDOM(content, {
      url: baseURLFallback,
    })
    const doc = dom.window.document

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
    const req = new Request(url.toString(), {
      headers: this.config.headers,
    })

    const res = await fetch(req)
    if (!res.ok) {
      throw new Error(`bad status response: ${res.statusText}`)
    }
    const body = await res.text()
    return this.grab(body, url.toString())
  }
}

export default HTMLGrabr
