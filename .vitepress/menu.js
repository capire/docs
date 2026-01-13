/* eslint-disable no-console */

import { dirname, relative, resolve, join, normalize } from 'node:path'
import { existsSync, promises as fs } from 'node:fs'
import rewrites from './rewrites.js'

const DEBUG = process.env.DEBUG?.match(/\b(menu|all)\b/) ? (...args) => console.debug ('[menu.js] -', ...args) : undefined
const EXTERNAL = process.env.VITE_CAPIRE_ENV === 'external'
const PRUNE_UNRELEASED = process.env.VITE_CAPIRE_PRUNE_UNRELEASED === 'true'  // usually on CI builds
const cwd = process.cwd()


/**
 * A MenuItem represents a menu item with text and link.
 * It can have sub-items which are collapsed by default.
 */
export class MenuItem {

  /**
   * Constructs a new menu item with the given text, link, and sub-items.
   */
  constructor (text, link, items) {
    if (text) this.text = text.replace(/<!--.*-->/, '')
    if (link) this.link = link[0] === '/' ? link : '/'+ link
    if (items) this.items = items
  }

  /**
   * Constructs and adds a new sub-item to this item's child items.
   */
  add (text, link, subitems) {
    const item = new MenuItem (text, link, subitems)
    const items = this.items ??= []; items.push (item)
    this.collapsed = true
    return item
  }

  /**
   * Returns a clone of this item with the given overrides.
   */
  with (overrides) {
    return {__proto__:this, ...this, ...overrides }
  }

  /**
   * Reads a submenu from the given file and adds all its items
   * into this item's child items.
   */
  async include (filename, parent='.', _rewrite = rewrites, include, exclude) {
    const root = dirname(parent), folder = dirname(filename)
    const rewrite = link => link[0] === '/' ? link : _rewrite (normalize(join(folder,link)))
    const {items} = await Menu.from (join(root,filename), rewrite, include, exclude)
    if (items) (this.items ??= []).push (...items)
    const index = existsSync (join (root,folder,'index.md'))
    if (index) this.link = `/${folder}/`; else delete this.link
    this.collapsed = true
  }
}


export class Menu extends MenuItem {

  /**
   * Parses a menu.md markdown file into menu structures that
   * can be used for VitePress sidebar.
   */
  static async from (file = 'menu.md', rewrite = rewrites, include = ()=> true, exclude = l => l?.startsWith('../')) {

    DEBUG?.('reading:', relative(cwd,file))
    const lines = await fs.readFile(resolve(file),'utf8') .then (s => s.split('\n'))
    const menu = new this, children = [ menu ] // stack of recent children, used below

    for (let i=0; i<lines.length; i++) {
      const each = lines[i]; if (!each) continue //> skip empty lines

      // Parse line into hashes, text, and link
      let [, hashes, text, link ] =
        /^\s*(#+)\s*\[(.*)\]\((.*)\)/.exec(each) || // with link
        /^\s*(#+)\s(.*)/.exec(each) || []          // without link
      if (!hashes) continue //> skip lines not starting with #es


      if (EXTERNAL) {
        let unreleased = each.match(/<!-- (UNRELEASED|INTERNAL) -->/)
        if (unreleased) {
          if (PRUNE_UNRELEASED && link) {
            let targetFile = resolve (cwd, dirname(file), link.replace(/^\//, '').replace(/\/$/,'/index.md'))
            if (!targetFile.endsWith('.md')) targetFile += '.md'
            if (existsSync(targetFile)) await fs.unlink(targetFile)
            DEBUG?.('pruned:', relative(cwd,targetFile), 'at', relative(cwd,file)+':'+(i+1))
          } else {
            DEBUG?.('skipped:', unreleased[0], text, 'at', relative(cwd,file)+':'+(i+1))
          }
          continue
        }
      }

      // Get parent from stack -> it's the recent stack entry with less hashes
      let parent = children [hashes.length-1]
      if (!parent) throw new Error (`Missing parent for: ${each.trim()} at ${relative(cwd,file)}:${i+1}`)

      // Rewrite link and skip if excluded
      let is_submenu = /\/(_?menu.md)$/.exec(link)
      if (link) {
        if (link[0] !== '/' && !is_submenu) link = rewrite(link)
        if (exclude(link) || !include(link)) {
          DEBUG?.('excluded:', each.trim(), 'at', relative(cwd,file)+':'+(i+1))
          continue
        }
      }

      // Add new item to parent, and to the stack of children
      let child = !text ? parent : children[hashes.length] = parent.add (text, link)
      if (is_submenu) await child.include (link, file, rewrite, include, exclude)
    }

    // Return menu when all includes are done
    return menu
  }

  /**
   * Returns the level 1 and level 2 items of the menu for use
   * by VitePress nav bar. @returns {MenuItem[]}
   */
  get navbar() {
    const navbar = new Menu
    for (let {text,items} of this.items) if (items) {
      items = items.filter (it => it.link) .map (({text,link}) => ({text,link}))
      if (items.length) navbar.add (text, null, items)
    }
    return this.navbar = navbar.items
  }
  set navbar (v) { super.navbar = v }


  /**
   * CLI methods for ad-hoc tests
   */
  static async exec (args) {

    // Parse command line options
    const options = { depth: 11, colors: true }
    for (let o; (o = /^--?(.*)/.exec(args[0])?.[1]); args.shift()) {
      if (o === 'help' || o === '?') return console.log ('Usage: \n\n  ', this.usage(), '\n')
      let [, k, v=true] = /^([^=]*)(?:=(.*))?/.exec(o)
      options[k] = v
    }
    DEBUG?.('options:', options)

    // Parse menu.md file(s) with optional rewrites
    const {default:rewrites} = options.rewrites ? await import (resolve (options.rewrites)) : {}
    const menu = await this.from (args.shift(), rewrites)

    // Print result
    const result = options.navbar ? menu.navbar : menu
    const {inspect} = await import ('node:util')
    console.log (inspect(result, options))
  }

  static usage() {
    const me = relative (cwd, import.meta.url.slice(7)) // skipping file:// prefix
    return `node ${me} [--rewrites] [--navbar] <menu.md>`
  }
}


// Run the CLI method if invoked from command line
if (typeof __filename === 'undefined') Menu.exec (process.argv.slice(2))
