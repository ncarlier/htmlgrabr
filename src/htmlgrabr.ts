import fetch, { Headers, Request } from 'node-fetch'
import { URL } from 'url'
import { promisify } from 'util'
import * as DOM from './dom_handler'
import { clean } from './dom_cleaner'
import { isBlacklisted, BlacklistCtrlFunc } from './blacklist';

const pretty = require('pretty')
const h2p = require('html2plaintext')

const readability = promisify(require('node-readability'))

interface GrabberConfig {
  debug?: boolean
  isBacklisted?: BlacklistCtrlFunc
  headers?: Headers
}

interface GrabbedPage {
  title: string
  url: string | null
  image: string | null
  html: string
  text: string
  images: DOM.ImageMeta[]
}

const DefaultConfig: GrabberConfig = {
  debug: false,
  isBacklisted: isBlacklisted,
  headers: new Headers({
    'User-Agent': 'Mozilla/5.0 (compatible; HTMLGrabr/1.0)',
  })
}

export default class HTMLGrabr {

  config: GrabberConfig

  constructor(config: GrabberConfig = DefaultConfig) {
    this.config = { ...DefaultConfig, ...config }
  }

  /**
   * Grabs the content of a page from HTML text.
   * @param html a string that contains HTML code
   * @returns a page object
   */
  async grab(html: string): Promise<GrabbedPage> {
    // Use Readability.js to extract HTML content
    const article = await readability(html)
    const doc = article.document

    // Extract base URL
    const baseURL = DOM.extractBaseUrl(doc) || undefined

    // Extract Open Graph propreties
    const ogProps = DOM.extractOpenGraphProps(doc)

    // Clean the DOM
    clean(doc, { baseURL, debug: this.config.debug , isBacklisted: this.config.isBacklisted })

    // Extract images
    const images = DOM.extractImages(doc, ogProps.image)

    // Backup HTML content (if Readability fails)
    let content = doc.body.innerHTML
    if (article.content) {
      // Extract HTML content
      content = article.content
    }

    return {
      title: ogProps.title || article.title,
      url: ogProps.url || baseURL,
      image: ogProps.image,
      html: pretty(content, { ocd: true }),
      text: h2p(content),
      images
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
    const result = await this.grab(body)
    if (!result.url) {
      result.url = url.toString()
    }
    return result
  }
}
