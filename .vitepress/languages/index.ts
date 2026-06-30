import { bundledLanguages } from 'shiki'
import cds from './cds.tmLanguage.json' with { type: 'json' }
import csv from './csv.tmLanguage.json' with { type: 'json' }
import log from './log.tmLanguage.json' with { type: 'json' }
import scsv from './scsv.tmLanguage.json' with { type: 'json' }

import type { LanguageInput } from 'shiki'

export default [

  { ...cds, aliases:['cds','cdl','dcl','cql'] },
  { ...csv, aliases:['csv','csvc'] },
  { ...scsv, aliases:['csvs'] },
  { ...log, aliases:['log','logs'] },
  () => langAlias('php', 'httpc'),

] as LanguageInput[]

async function langAlias(targetLang: keyof typeof bundledLanguages, alias: string) {
  const grammars = (await bundledLanguages[targetLang]()).default
  const targetScope = `source.${targetLang}`
  return grammars.map(g => g.scopeName === targetScope
    ? { ...g, aliases: [...(g.aliases ?? []), alias] }
    : g,
  )
}
