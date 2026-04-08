import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML string to prevent XSS attacks.
 * Use before injecting content via innerHTML or document.write.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    // Allow standard print/layout tags
    ALLOWED_TAGS: [
      "div", "span", "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
      "table", "thead", "tbody", "tr", "th", "td",
      "strong", "b", "em", "i", "u", "small", "sub", "sup",
      "ul", "ol", "li",
      "a", "img",
      "style", "link",
      "section", "article", "header", "footer",
    ],
    ALLOWED_ATTR: [
      "class", "id", "style", "href", "src", "alt", "title",
      "width", "height", "colspan", "rowspan", "align", "valign",
    ],
  });
}
