# HTMLGrabr library

[![Travis](https://img.shields.io/travis/ncarlier/htmlgrabr.svg)](https://travis-ci.org/ncarlier/htmlgrabr)
[![Coverage Status](https://coveralls.io/repos/github/ncarlier/htmlgrabr/badge.svg?branch=master)](https://coveralls.io/github/ncarlier/htmlgrabr?branch=master)
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg)](https://paypal.me/nunux)

A Node.js library to grab and clean HTML content.

### Features

- Extract page content from an URL (`HTMLGrabr.grabURL(url: URL): GrabbedPage`)
- Extract page content from a string (`HTMLGrabr.grab(s: string): GrabbedPage`)
- Extract Open Graph properties
- Clean the page content:
  - Extract main HTML content using [mozilla-readability](https://github.com/mozilla/readability)
  - Sanitize HTML content using [DOMPurify](https://github.com/cure53/DOMPurify), with some extras:
    - Remove unwanted links or images
    - Remove pixel tracker
    - Remove unwanted attributes (such as `style`, `class`, `id`, ...)
    - And more

### Usage

```bash
npm install --save htmlgrabr
```

The in your code:

```javascript
const HTMLGrabr = require('htmlgrabr').HTMLGrabr
const { URL } = require('url')

const grabber = new HTMLGrabr()

grabber.grabUrl(new URL('https://about.readflow.app'))
  .then(page => {
    console.log(page)
  }, err => {
    console.error(err)
  })
```

### API

Create new instance:

```js
const HTMLGrabr = require('htmlgrabr').HTMLGrabr
const grabber = new HTMLGrabr(config)
```

Configuration object:

```typescript
interface GrabberConfig {
  debug?: boolean                     // Print debug logs if true
  pretty?: boolean                    // Beautify HTML content if true
  isBlockedHost?: BlockedHostCtrlFunc // Function used to detect unwanted URLs
  rewriteURL?: URLRewriterFunc        // Function used to rewrite HTML src attributes
  rules?: Map<string, Rule>           // Rule definitions (see below)
  headers?: Headers                   // HTTP headers to set
}
```

Rule definition:

```typescript
export interface Rule {
  selector: string             // HTML query selector
  type: 'redirect' | 'content' // Rule type:
  // - 'redirect' will use 'src' or 'href' attribute to redirect content extraction
  // - 'content' to specify content to extract
}
```

Grab a page:

```js
const result = grabber.grabUrl(new URL('https://...'))
```

Result object:

```typescript
interface GrabbedPage {
  title: string        // Page title
  url: string | null   // Source URL
  image: string | null // Page illustration
  html: string         // HTML content
  text: string         // Text content (from HTML)
  excerpt: string      // Excerpt (from meta data or HTML)
  length: number       // Read length
  images: ImageMeta[]  // Embedded image URLs
}
```

---
