import { resolve, parse } from "url";
import { JSDOM } from "jsdom";
import * as createDOMPurify from "dompurify";

import { BlacklistCtrlFunc } from "./blacklist";
import { isElementNode } from "./helpers";

export interface URLRewriterFunc {
  (url: string): string;
}

interface CleanupProps {
  baseURL?: string;
  debug?: boolean;
  isBlacklisted?: BlacklistCtrlFunc;
  rewriteURL?: URLRewriterFunc;
}

interface FilterFunc {
  (currentNode: Element, event: DOMPurify.HookEvent, config: DOMPurify.Config): void;
}

/**
 * Remove all blacklisted attributes from a HTML element.
 * @param blacklist the list of attributes to remove
 * @returns the filtering function
 */
export function removeAttributes(blacklist: string[]): FilterFunc {
  return (node) => {
    if (isElementNode(node)) {
      blacklist.forEach((attr) => node.hasAttribute(attr) && node.removeAttribute(attr));
    }
  };
}

/**
 * Remove a image that can be a tracker (1px square).
 * @returns the filtering function
 */
export function removeImageTracker(): FilterFunc {
  return (node) => {
    if (node.tagName === "IMG" && (node.hasAttribute("height") || node.hasAttribute("width"))) {
      const height = node.getAttribute("height");
      const width = node.getAttribute("width");
      if (height === "1" && width === "1" && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
  };
}

/**
 * Delete all HTML elements that refer to a blacklisted site.
 * @param isBlacklist function to control if the hostname is blacklisted
 * @returns the filtering function
 */
export function removeBlacklistedLinks(isBlacklisted: BlacklistCtrlFunc): FilterFunc {
  return (node) => {
    if (isElementNode(node) && (node.hasAttribute("src") || node.hasAttribute("href"))) {
      const src = node.getAttribute("src") || node.getAttribute("href");
      if (src) {
        const hostname = parse(src).hostname || "undefined";
        if (isBlacklisted(hostname) && node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
    }
  };
}

/**
 * Update link to target new blank window.
 * @returns the filtering function
 */
export function externalizeLinks(): FilterFunc {
  return (node) => {
    if (node.tagName == "A" && node.hasAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  };
}

/**
 * Update relative link to be absolute.
 * @param baseURL the base URL used to make the link absolute
 * @returns the filtering function
 */
export function rebaseSrcAttribute(baseURL: string): FilterFunc {
  const absoluteUrlRe = new RegExp("^https?://");
  return (node) => {
    if (isElementNode(node)) {
      const attr = node.hasAttribute("src") ? "src" : node.hasAttribute("href") ? "href" : null;
      if (attr) {
        const src = node.getAttribute(attr);
        if (src && !absoluteUrlRe.test(src)) {
          node.setAttribute(attr, resolve(baseURL, src));
        }
      }
    }
  };
}

/**
 * Move attribute to another.
 * @param attr1 source attribute to remove
 * @param attr2 target attribute
 * @returns the filtering function
 */
export function moveAttribute(attr1: string, attr2: string): FilterFunc {
  return (node) => {
    if (isElementNode(node) && node.hasAttribute(attr1)) {
      const val1 = node.getAttribute(attr1);
      const val2 = node.getAttribute(attr2) || "";
      node.setAttribute(attr2, val1 || val2);
      node.removeAttribute(attr1);
    }
  };
}

export function addLazyLoadingAttribute(): FilterFunc {
  return (node) => {
    if (node.nodeName === "IFRAME" || node.nodeName === "IMG") {
      node.setAttribute("loading", "lazy");
    }
  };
}

export function rewriteSrcAttribute(rewriteURL: URLRewriterFunc): FilterFunc {
  return (node) => {
    if (isElementNode(node) && node.hasAttribute("src")) {
      const value = node.getAttribute("src");
      if (value) {
        node.setAttribute("src", rewriteURL(value));
      }
    }
  };
}

const DefaultFilterChain = [
  removeAttributes(["id", "class"]),
  removeImageTracker(),
  externalizeLinks(),
  addLazyLoadingAttribute(),
  // moveAttribute('data-src', 'src')
];

/**
 * Clean a DOM using a filter chain.
 * @param doc DOM to clean
 * @param props properties used by filters
 * @param filters chain filter
 */
export function sanitize(
  html: string,
  props: CleanupProps,
  filters: FilterFunc[] = DefaultFilterChain
) {
  const window = new JSDOM("<!DOCTYPE html>").window as unknown;
  const purify = createDOMPurify(window as Window) as DOMPurify.DOMPurifyI;

  if (props.baseURL) {
    filters.push(rebaseSrcAttribute(props.baseURL));
  }
  if (props.isBlacklisted) {
    filters = [removeBlacklistedLinks(props.isBlacklisted), ...filters];
  }
  if (props.rewriteURL) {
    filters = [rewriteSrcAttribute(props.rewriteURL), ...filters];
  }

  filters.forEach((filter) => purify.addHook("beforeSanitizeElements", filter));
  return purify.sanitize(html, {
    ADD_ATTR: ["target"],
  });
}
