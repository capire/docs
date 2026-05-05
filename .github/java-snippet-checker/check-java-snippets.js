#!/usr/bin/env node

// Java Snippet Checker
// ===================
//
// Similar to the CDS snippet checker, check Java snippets for syntax errors.
// We use the "java-parser" NPM package for that.
// All code-blocks are extracted. If they were set to `java`, we extract the
// snippet and parse it.
//
// In case of errors, we try to wrap the snippet and parse it again.
//
//  - First try to parser it again with a class surrounding the snippet.
//  - If that fails, try the same with a method.
//  - If that fails, mark snippet as invalid.
//
// Also, we run a few pre-processing steps and use heuristics:
// We remove `...` markers and `imports`, etc.
//
// You can disable checking of a snippet by prepending a `<!-- mode: ignore -->`
// comment right before the snippet.
//
// TODO:
//  - [ ] combine code with the CDS snippet checker.

'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseJava } from 'java-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const projectDir = path.resolve(__dirname, '../..');
const verbose = process.argv[2] === '--verbose';

// Get base directories
const excludedDirs = [
  '.git',
  '.github',
  'node_modules',
  '.reuse',
  '.vitepress',
  '.idea',
  '.vscode',
  '.devcontainer',
];
const baseDirs = fs.readdirSync(projectDir)
  .filter(file => fs.statSync(path.join(projectDir, file)).isDirectory() && !excludedDirs.includes(file))
  .map(file => path.join(projectDir, file));

const JAVA_MODE_SYNTAX = 'syntax';
const JAVA_MODE_IGNORE = 'ignore';
const javaModes = [
  JAVA_MODE_SYNTAX,
  JAVA_MODE_IGNORE,
];

let counter = 0;
let hasAnySnippetErrors = false;

// Logging should always go to stderr. Have some convenience functions to minimize verbosity.
const log   = (...args) => { console.error(...args); };
const error = (...args) => { console.error(...args); };
const debug = (...args) => { verbose && console.error(...args); };

for (const dir of baseDirs) {
  const files = getFilesInDirectory(dir, /[.]md/);
  log(`Checking ${files.length} markdown documents in ${path.relative(projectDir, dir)}`);

  for (const snippet of extractSnippetsFromFiles(files)) {
    ++counter;

    if (snippet.mode === JAVA_MODE_IGNORE)
      continue;

    snippet.original = snippet.content;
    snippet.content  = prepareSnippet(snippet.content);

    const variations = [
      { content: snippet.content, error: null },
      { content: snippetAsMethod(snippet.content), error: null },
      { content: snippetAsExpression(snippet.content), error: null },
      { content: snippetAsCode(snippet.content), error: null },
    ];

    // We assume that the snippet has an error.
    // If any of the variations _passes_, then the snippet is ok.
    let snippetHasError = true;
    for (const variation of variations) {
      variation.error = compileSnippet(variation.content);
      if (!variation.error) {
        snippetHasError = false;
        break; // success
      }
    }

    if (snippetHasError) {
      hasAnySnippetErrors = true;
      printErrorForSnippet(snippet, variations);

    } else if (verbose) {
      log(`Snippet ${counter}`);
      log(snippet.content);
    }
  }

  log('');
}

log(`Checked ${counter} snippets.`);

if (hasAnySnippetErrors) {
  error('\nError! Found syntax errors!');
  process.exit(1);

} else {
  log('Success! Found no syntax errors.');
  process.exit(0);
}

// ----------------------------------------------------------------------------

function printErrorForSnippet(snippet, variations) {
  log('--------------------------------------------------------------------')
  log(`Errors in file ./${path.relative(projectDir, snippet.file)}`)
  log('In following snippet\n')
  log('  ```java')
  log(indentLines(snippet.original, 2))
  log('  ```')
  log('')

  for (const variation of variations) {
    log(`which was modified and compiled again as:
  \`\`\`java
${indentLines(variation.content, 2)}
  \`\`\`

which then ended up with errors:

${indentLines(variation.error.message, 2)}
      `);
  }
  log('')
}

/**
 * @param {string} content
 */
function compileSnippet(content) {
  try {
    parseJava(content);
    return null;

  } catch (e) {
    // the Java parser uses this string in its error messages
    if (!e.message.includes('sad panda'))
      throw e;

    if (e.message.length > 200) {
      // cut off message text; the original length is too large
      e.message = e.message.slice(0, 200);
    }
    return e;
  }
}

function prepareSnippet(content) {
  // Delete "import" statements, as they are mixed in with other code.
  content = content.replace(/^import .*$/mug, '');
  // `= ...;` is replaced by `= null`
  content = content.replace(/= *[.][.][.];/mug, '= null;');
  // `= ...` is replaced by `= null;` (additional semicolon)
  content = content.replace(/= [.][.][.]/mug, '= null;');
  // `, ...` is removed
  content = content.replace(/, ?[.][.][.]/mug, '');
  content = content.replace(/[.][.][.] ?,/mug, '');
  // And other remaining `...` are removed
  content = content.replace(/[.][.][.]|…/g, '');
  // Sometimes `---` is used as a delimiter
  content = content.replace(/^---+.*$/gm, '');
  return content;
}

/**
 * @param {string} content
 */
function snippetAsMethod(content) {
  return `// Snippet Checker
class MyClass {
${ indentLines(content.trim(), 2) }
}
`;
}

/**
 * @param {string} content
 */
function snippetAsCode(content) {
  return `// Snippet Checker
class SnippetCheckerClass {
  void snippetCheckerMethod() {
${ indentLines(content.trim(), 4) }
  }
}
`;
}

/**
 * @param {string} content
 */
function snippetAsExpression(content) {
  return `// Snippet Checker
Object o =
${ indentLines(content.trim(), 4) }
;
`;
}

/**
 * @param {string[]} files
 */
function* extractSnippetsFromFiles(files) {
  for (const filename of files) {
    for (const section of extractSections(filename)) {
      for (const snippet of extractSnippets(section.content)) {
        yield {
          file: filename,
          ...snippet,
        };
      }
    }
  }
}

/**
 * @param {string} file
 */
function* extractSections(file) {
  const content = fs.readFileSync(file, 'utf-8');
  const sections = content.split(/^#/gm);

  for (const content of sections) {
    // Skip empty parts
    if (content.trim() === "")
      continue;

    const heading = content.slice(0, content.indexOf('\n'));
    yield {
      heading,
      content,
    };
  }
}

/**
 * @param {string} section
 */
function* extractSnippets(section) {
  // Note: [^] matches any character, including newlines
  const re = /^(?:\s*<!--(.+)-->\n)?```([a-zA-Z]+)\s*\n([^]*?)\n```\s*$/gm;

  let snippets;
  while ((snippets = re.exec(section)) !== null) {
    const language = snippets[2].toLowerCase();
    const content = snippets[3];
    let mode;

    if ('java' !== language)
      continue;

    // Code snippets may have a configuration in form of an HTML comment.
    // When a cds-mode comment exists, we ignore the language.
    if (snippets[1]) {
      const modeRegEx = /mode: ([^,;]+)/;
      const result = modeRegEx.exec(snippets[1]);
      if (result && result[1])
        mode = result[1].trim();
    }

    yield { mode, content };
  }
}

/**
 * @param {string} dir
 * @param {RegExp} fileRegEx
 * @returns {string[]}
 */
function getFilesInDirectory(dir, fileRegEx) {
  let results = [];
  const files = fs.readdirSync(dir);

  for (let file of files) {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesInDirectory(file));
    } else {
      if (!fileRegEx || file.match(fileRegEx))
        results.push(file);
    }
  }
  return results;
}

/**
 * Indent the given string by `indent` whitespace characters.
 *
 * @param {string} str
 * @param {number} indent
 * @returns {string}
 */
function indentLines(str, indent) {
  const indentStr = ' '.repeat(indent);
  const lines = str.split(/\r\n?|\n/);
  return lines.map(s => indentStr + s).join('\n');
}

