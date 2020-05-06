import HTMLGrabr from "../src/htmlgrabr";
import { URL } from "url";
import { readdir, readFile } from "fs";
import { resolve } from "path";
import { promisify } from "util";

const ls = promisify(readdir);
const read = promisify(readFile);

interface TestCase {
  [key: string]: any;
}

/**
 * HTMLGrabr tests
 */
describe("Smoke test", () => {
  it.skip("fetch bad URL", async () => {
    expect.assertions(1);
    const grabber = new HTMLGrabr();
    try {
      await grabber.grabUrl(new URL("https://www.nunux.org/404"));
    } catch (e) {
      expect(e.toString()).toMatch(/^Error: bad status response:/);
    }
  });

  it.skip("fetch a URL", async () => {
    const grabber = new HTMLGrabr();
    expect(grabber.config.debug).toBeFalsy();
    if (grabber.config.headers) {
      expect(grabber.config.headers.has("User-Agent")).toBeTruthy();
    }
    const page = await grabber.grabUrl(new URL("https://keeper.nunux.org"));
    expect(page).not.toBeNull();
    expect(page.title).toEqual("Nunux Keeper");
    expect(page.url).toEqual("https://keeper.nunux.org/");
  });

  it("simple cleanup test case", async () => {
    const grabber = new HTMLGrabr({
      pretty: true,
      rewriteURL: (src) => `https://foo.bar/${src}`,
    });
    expect(grabber.config.pretty).toBeTruthy();
    const page = await grabber.grab(`
      <html>
        <head><title>Test</title></head>
        <body>
          <p>Hello World!</p><p><img src="world.png" /></p>
        </body>
      </html>`);
    expect(page).not.toBeNull();
    expect(page.title).toEqual("Test");
    expect(page.html).toEqual(`<div>
  <p>Hello World!</p>
  <p><img loading="lazy" src="https://foo.bar/world.png"></p>
</div>`);
    expect(page.excerpt).toEqual("Hello World!");
  });

  it("iterate over all cleanup test cases", async () => {
    // load test cases
    const files = await ls(resolve(__dirname, "cases"));
    const tc = new Map<string, TestCase>();
    for (const filename of files) {
      const content = await read(resolve(__dirname, "cases", filename), { encoding: "utf8" });
      const match = filename.match(/^(.+)_(expected|input|meta)\.(html|json)$/);
      if (match && match.length === 4) {
        const [_, name, key, type] = match;
        const t = tc.get(name) || {};
        t[key] = type === "json" ? JSON.parse(content) : content;
        tc.set(name, t);
      }
    }
    // Run tests
    const grabber = new HTMLGrabr({ pretty: true });
    for (const t of tc.values()) {
      const page = await grabber.grab(t.input);
      expect(page).not.toBeNull();
      expect(page.title).toEqual(t.meta.title);
      expect(page.url).toEqual(t.meta.url);
      expect(page.html.trim()).toEqual(t.expected.trim());
    }
  });
});
