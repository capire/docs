import cds from './cds.tmLanguage.json' with {type:'json'}
import csv from './csv.tmLanguage.json' with {type:'json'}
import log from './log.tmLanguage.json' with {type:'json'}
import scsv from './scsv.tmLanguage.json' with {type:'json'}

import type { LanguageInput } from 'shiki'
export default [
  { ...cds, aliases:['cds','dcl', 'cql'] },
  { ...csv, aliases:['csv','csvc'] },
  { ...scsv, aliases:['csvs'] },
  { ...log, aliases:['log','logs'] },
] as LanguageInput[]
