import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({
    gfm: true,
    breaks: true,
});

const ALLOWED_TAGS = [
    "h1", "h2", "h3", "h4",
    "p",
    "ul", "ol", "li",
    "strong", "em", "code", "pre",
    "blockquote",
];

export async function llmMarkdownToHtml(markdown: string) {
    if (!markdown) { return ""; }

    const rawHtml = await marked.parse(markdown);

    return sanitizeHtml(rawHtml, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: {},
    });
}