import fetch, { Headers, Request } from 'node-fetch'
import { URL } from 'url'
import { JSDOM } from 'jsdom'
import * as pretty from 'pretty'
import * as Readability from 'mozilla-readability'

import { sanitize, URLRewriterFunc } from './sanitize'
import { extractBaseUrl, extractImages, extractOpenGraphProps, ImageMeta } from './helpers'
import { isBlacklisted, BlacklistCtrlFunc } from './blacklist'

interface GrabberConfig {
  debug?: boolean
  pretty?: boolean
  isBlacklisted?: BlacklistCtrlFunc
  rewriteURL?: URLRewriterFunc
  headers?: Headers
}

interface GrabbedPage {
  title: string
  url: string | null
  image: string | null
  html: string
  text: string
  excerpt: string
  length: number
  images: ImageMeta[]
}

const DefaultConfig: GrabberConfig = {
  debug: false,
  pretty: false,
  isBlacklisted: isBlacklisted,
  headers: new Headers({
    'User-Agent': 'Mozilla/5.0 (compatible; HTMLGrabr/1.0)',
  }),
}

export default class HTMLGrabr {
  config: GrabberConfig

  constructor(config: GrabberConfig = {}) {
    this.config = { ...DefaultConfig, ...config }
  }

  /**
   * Grabs the content of a page from HTML content.
   * @param content a string that contains HTML code
   * @param baseURL a string that contains HTML base URL
   * @returns a page object
   */
  async grab(content: string, baseURL?: string): Promise<GrabbedPage> {
    const { debug, isBlacklisted, rewriteURL } = this.config

    // Load sanitized content into a virtual DOM
    const dom = new JSDOM(content, {
      url: baseURL,
    })
    const doc = dom.window.document

    // Extract base URL
    baseURL = extractBaseUrl(doc) || baseURL

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
  async grabUrl(url: URL) {
    const req = new Request(url.toString(), {
      headers: this.config.headers,
    })

    const res = await fetch(req)
    if (!res.ok) {
      throw new Error(`bad status response: ${res.statusText}`)
    }
    const body = await res.text()
    return await this.grab(body, url.toString())
  }
}
