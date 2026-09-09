import { promises as fs } from 'node:fs'

export class Rewrites {

  static redirects = {}
  static rewrites = {
    // 'guides/advanced/': 'advanced/',
    // 'refs/': ''
  }

  /**
   * Read redirects or rewrites from markdown files...
   */
  static async from (filename) {
    const entries = {}
    try {
      const md = await fs.readFile (filename,'utf-8')
      for (let line of md.split('\n')) {
        let [,from,to] = /^[^[]*\[(.*)\]\((.*)\)/.exec(line) || []
        if (!from || !to) continue
        entries[from] = to
      }
    } catch {/* ignored */}
    return entries
  }

  /**
   * Returns a rewrite function for the given redirects and rewrites.
   * @returns {(link:string) => string}
   */
  static for ({
    redirects = this.redirects,
    rewrites = this.rewrites,
  }) {
    const rules = Object.entries(rewrites) //.map(([from,to]) => [ new RegExp('^'+from), to ])
    const rewrite = link => {
      if (link[0] === '/') link = link.slice(1)
      if (link in redirects) return redirects [link]
      else for (let [from,to] of rules)
        if (link.startsWith(from)) return to + link.slice(from.length)
      return link
    }
    return rewrite
  }
}


export default Rewrites.for(Rewrites)
export const redirects = Rewrites.redirects
export const rewrites = Rewrites.rewrites
