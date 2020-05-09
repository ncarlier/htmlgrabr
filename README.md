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
    - Remove blacklisted links or images
    - Remove pixel tracker
    - Remove unwanted attributes (such as `style`, `class`, `id`, ...)
    - And more

The result is a grabbed page object:

```typescript
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
```

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

---
