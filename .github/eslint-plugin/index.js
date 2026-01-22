#!/usr/bin/env node

// eslint plugin rule utility
// ============================
// node index.js generate-menu
// generates the _menu.md file to make sure all rules are included.
// node index.js generate-js-stub <rule-name>
// generates a stub markdown file for a new JS rule with name <rule-name>.

import * as fs from 'node:fs'
import * as path from 'node:path'

const RULES_BASE_PATH    = path.join(import.meta.dirname, '../../tools/cds-lint/rules');
const EXAMPLES_BASE_PATH = RULES_BASE_PATH
const MENU_FILE_NAME = '_menu.md';

/**
 * Get a list of all rule description files.
 * @returns {string[]} An array of rule description file names.
 */
const getRuleDescriptionFiles = () => fs.globSync(path.join(RULES_BASE_PATH, '*/index.md')).sort()

/**
 * Generates the menu markdown file
 * by completely overriding its current contents.
 * The menu contains links to all rule description files
 * in alphabetical order.
 */
function generateMenuMarkdown () {
    const rules = getRuleDescriptionFiles();
    const menu = rules.map(rule => {
        const folderPath = path.posix.dirname(path.relative(RULES_BASE_PATH, rule));
        const name = path.basename(folderPath);
        return `# [${name}](${folderPath}/)`
    }).join('\n');
    const menuFilePath = path.join(RULES_BASE_PATH, MENU_FILE_NAME)
    fs.writeFileSync(menuFilePath, menu);
    console.info(`generated menu to ${path.relative(process.cwd(), menuFilePath)}`);
}

/**
 * Generates a stub markdown file for a new JS rule.
 * The passed ruleName will be placed in the stub template
 * where $RULE_NAME is defined.
 * @param {string} ruleName - The name of the rule.
 */
function generateJsRuleStub (ruleName) {
    if (!ruleName) {
        console.error('Please provide a rule name, e.g. "no-shared-handler-variables" as second argument');
        process.exit(1);
    }
    const stubFilePath = path.join(RULES_BASE_PATH, ruleName, 'index.md');
    if (fs.existsSync(stubFilePath)) {
        console.error(`file ${stubFilePath} already exists, will not overwrite`);
        process.exit(2);
    }
    fs.mkdirSync(path.dirname(stubFilePath), { recursive: true });
    const stub = fs.readFileSync(path.join(import.meta.dirname, 'js-rule-stub.md'), 'utf-8').replaceAll('$RULE_NAME', ruleName);
    fs.writeFileSync(stubFilePath, stub);
    console.info(`generated stub to ${stubFilePath}`);
    const correctPath = path.join(EXAMPLES_BASE_PATH, ruleName, 'correct', 'srv');
    fs.mkdirSync(correctPath, { recursive: true });
    const incorrectPath = path.join(EXAMPLES_BASE_PATH, ruleName, 'incorrect', 'srv');
    fs.mkdirSync(incorrectPath, { recursive: true });
    console.info(`generated example directories in ${path.join(EXAMPLES_BASE_PATH, ruleName)}`);
    fs.writeFileSync(path.join(correctPath, 'admin-service.js'), '// correct example\n');
    fs.writeFileSync(path.join(incorrectPath, 'admin-service.js'), '// incorrect example\n');
}

function main (argv) {
    switch (argv[0]) {
        case 'generate-menu':
            generateMenuMarkdown();
            break;
        case 'generate-js-stub':
            generateJsRuleStub(argv[1]);
            generateMenuMarkdown();
            break;
        default:
            console.log(`Unknown command: ${argv[0]}. Use one of: generate-menu, generate-stub`);
    }
}

main(process.argv.slice(2));