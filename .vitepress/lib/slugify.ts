// VS Code-compatible GitHub-style slugifier (mirrors markdown-language-features/src/slugify.ts).
// Used as VitePress' markdown anchor slugifier, and reused to derive heading anchors elsewhere (e.g. llms-full.txt).
export function slugify(str: string): string {
  return str
    .trim().toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
    .replace(/\s/g, '-')
}
