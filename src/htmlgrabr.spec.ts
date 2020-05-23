import test from 'ava'
import { readdir, readFile } from 'fs'
import { resolve } from 'path'
import { URL } from 'url'
import { promisify } from 'util'
import HTMLGrabr from './htmlgrabr'

const ls = promisify(readdir)
const read = promisify(readFile)

interface TestCase {
  // tslint:disable-next-line: readonly-keyword
  [key: string]: any
}

test('grab bad URL', async (t) => {
  const grabber = new HTMLGrabr()
  const grab = grabber.grabUrl(new URL('https://www.nunux.org/404'))

  const error = await t.throwsAsync(grab)
	t.is(error.message, 'bad status response: Not Found')
})

test('grab valid URL', async (t) => {
  const grabber = new HTMLGrabr()
  t.falsy(grabber.config.debug)
  if (grabber.config.headers) {
    t.truthy(grabber.config.headers.has('User-Agent'))
  }
  const page = await grabber.grabUrl(new URL('https://keeper.nunux.org'))
  t.not(page, null)
  t.is(page.title, 'Nunux Keeper')
  t.is(page.url, 'https://keeper.nunux.org/')
})

test('grab URL with redirect rule definition', async (t) => {
  const grabber = new HTMLGrabr()
  t.falsy(grabber.config.debug)
  if (grabber.config.headers) {
    t.truthy(grabber.config.headers.has('User-Agent'))
  }
  const page = await grabber.grabUrl(new URL('https://www.reddit.com/r/programming/comments/gp3yq6/kong_api_gateway_from_zero_to_production/'))
  t.not(page, null)
  t.is(page.title, 'Kong API Gateway - Zero to Production')
  t.is(page.url, 'https://medium.com/@imarunrk/kong-api-gateway-zero-to-production-5b8431495ee')
})

test('grab simple HTML content', async (t) => {
  const grabber = new HTMLGrabr({
    pretty: true,
    rewriteURL: (src) => `https://foo.bar/${src}`,
  })
  t.truthy(grabber.config.pretty)
  const page = await grabber.grab(`
    <html>
      <head><title>Test</title></head>
      <body>
        <p>Hello World!</p><p><img src="world.png" /></p>
        <img height="1" width="1" src="stracker.jpg">
      </body>
    </html>`)
  t.not(page, null)
  t.is(page.title, 'Test')
  t.is(page.html, `<div>
  <p>Hello World!</p>
  <p><img loading="lazy" src="https://foo.bar/world.png"></p>
</div>`)
  t.is(page.excerpt, 'Hello World!')
})

test('grab uggly HTML contents', async (t) => {
  // load test cases
  const testCasesLocation = resolve(process.cwd(), 'specs')
  const files = await ls(testCasesLocation)
  const testCases = new Map<string, TestCase>()
  for (const filename of files) {
    const content = await read(resolve(testCasesLocation, filename), { encoding: 'utf8' })
    const match = filename.match(/^(.+)_(expected|input|meta)\.(html|json)$/)
    if (match && match.length === 4) {
      const [, name, key, type] = match
      const testCase = testCases.get(name) || {}
      testCase[key] = type === 'json' ? JSON.parse(content) : content
      testCases.set(name, testCase)
    }
  }
  const grabber = new HTMLGrabr({ pretty: true })
  // Run tests
  for (const testCase of testCases.values()) {
    const page = await grabber.grab(testCase.input)
    t.not(page, null)
    t.is(page.title, testCase.meta.title)
    t.is(page.url, testCase.meta.url)
    t.is(page.html.trim(), testCase.expected.trim())
  }
})
