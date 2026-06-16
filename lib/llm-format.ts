import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import sanitizeHtml from "sanitize-html";

// A dedicated Marked instance with syntax highlighting (highlight.js) so code blocks render with
// hljs token classes. Kept local so the global `marked` config is untouched.
const marked = new Marked(
    markedHighlight({
        emptyLangClass: "hljs",
        langPrefix: "hljs language-",
        highlight(code, lang) {
            const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
            try {
                return hljs.highlight(code, { language }).value;
            } catch {
                return code;
            }
        },
    }),
);
marked.setOptions({ gfm: true, breaks: true });

const ALLOWED_TAGS = [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "ul", "ol", "li",
    "strong", "em", "del", "code", "pre",
    "blockquote",
    "a", "span",
    // GFM tables (previously stripped → tables rendered as broken text)
    "table", "thead", "tbody", "tr", "th", "td",
];

export async function llmMarkdownToHtml(markdown: string) {
    if (!markdown) { return ""; }

    const rawHtml = await marked.parse(markdown);

    return sanitizeHtml(rawHtml, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: {
            a: ["href", "target", "rel"],
            // Allow highlight.js token classes + the language class on code blocks.
            code: ["class"],
            pre: ["class"],
            span: ["class"],
            td: ["align"],
            th: ["align"],
        },
        allowedClasses: {
            code: ["hljs", "language-*"],
            pre: ["hljs", "language-*"],
            span: ["hljs-*"],
        },
        transformTags: {
            a: sanitizeHtml.simpleTransform("a", {
                target: "_blank",
                rel: "noreferrer noopener",
            }),
        },
    });
}
