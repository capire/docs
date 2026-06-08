#!/usr/bin/env bash

dir=`dirname -- "$0"`

# create a temp project to run the commands in
proj=/tmp/your-project
rm -rf ${proj}
mkdir -p `dirname ${proj}`
pushd `dirname ${proj}` && cds init `basename ${proj}` --nodejs && pushd `basename ${proj}` && npm i && popd && popd

echo
echo "Grabbing CLI texts..."
${dir}/grab-cli-texts.js @cap-js/cds-typer "cds-typer --help"        ${proj} > ${dir}/../../tools/assets/help/cds-typer.out.md
${dir}/grab-cli-texts.js @sap/cds-dk       "cds --help"              ${proj} > ${dir}/../../tools/assets/help/cds-help.out.md
${dir}/grab-cli-texts.js @sap/cds-dk       "cds add --help"          ${proj} > ${dir}/../../tools/assets/help/cds-add.out.md
${dir}/grab-cli-texts.js @sap/cds-dk       "cds compile --help"      ${proj} > ${dir}/../../tools/assets/help/cds-compile.out.md
${dir}/grab-cli-texts.js @sap/cds-dk       "cds debug --help"        ${proj} > ${dir}/../../tools/assets/help/cds-debug.out.md
${dir}/grab-cli-texts.js @sap/cds-dk       "cds env --help"          ${proj} > ${dir}/../../tools/assets/help/cds-env.out.md
${dir}/grab-cli-texts.js @sap/cds-dk       "cds init --help"         ${proj} > ${dir}/../../tools/assets/help/cds-init.out.md
${dir}/grab-cli-texts.js @sap/cds-dk       "cds repl --help"         ${proj} > ${dir}/../../tools/assets/help/cds-repl.out.md
${dir}/grab-cli-texts.js @sap/cds-dk       "cds watch --help"        ${proj} > ${dir}/../../tools/assets/help/cds-watch.out.md
${dir}/grab-cli-texts.js @sap/cds-dk       "cds version"             ${proj} > ${dir}/../../tools/assets/help/cds-version.out.md
${dir}/grab-cli-texts.js @sap/cds-dk       "cds version --markdown"  ${proj} > ${dir}/../../tools/assets/help/cds-version-md.out.md
${dir}/grab-cli-texts.js @sap/cds-dk       "cds env requires.db"     ${proj} > ${dir}/../../tools/assets/help/cds-env-requires-db.out.md
${dir}/grab-cli-texts.js @sap/cds-dk       "cds env ls requires.db"  ${proj} > ${dir}/../../tools/assets/help/cds-env-ls-requires-db.out.md
${dir}/grab-cli-texts.js @sap/cds-dk       "cds -e .env.requires.db" ${proj} > ${dir}/../../tools/assets/help/cds-eval-env-requires-db.out.md
