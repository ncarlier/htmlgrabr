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
const HTMLGrabr = require('htmlgrabr')
const { URL } = require('url')

const grabber = new HTMLGrabr()

grabber.grabUrl(new URL('http://keeper.nunux.org'))
  .then(page => {
    console.log(page)
  }, err => {
    console.log(err)
  })
```

---
