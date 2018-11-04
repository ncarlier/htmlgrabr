# HTMLGrabr library

[![Travis](https://img.shields.io/travis/ncarlier/htmlgrabr.svg)](https://travis-ci.org/ncarlier/htmlgrabr)
[![Coverage Status](https://coveralls.io/repos/github/ncarlier/htmlgrabr/badge.svg?branch=master)](https://coveralls.io/github/ncarlier/htmlgrabr?branch=master)
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg)](https://paypal.me/nunux)

A Node.js library to grab and clean HTML content.

### Features

- Extract page content from an URL (`HTMLGrabr.grabURL(url: URL)`)
- Extract page content from a string (`HTMLGrabr.grab(s: string)`)
- Clean the page content:
  - Extract main content using `node-readability`
  - Extract text content using `html2plaintext`
  - Remove link or image references of blacklisted sites
  - Remove pixel tracker
  - Remove unwanted attributes (by default: `class` and `id`)
- Extract Open Graph properties

### Usage

```bash
npm install --save htmlgrabr
```

The in your code:

```javascript
import HTMLGrabr from 'htmlgrabr'

const url = new URL('http://example.com/foo.html')
const page = async HTMLGrabr.grab(url)

console.log('Page title:', page.title)
console.log('Page illustration:', page.image)
console.log('Page URL:', page.url)
console.log('Page HTML content:', page.html)
console.log('Page text content:', page.text)
console.log('Page images:', page.images)
```

---
