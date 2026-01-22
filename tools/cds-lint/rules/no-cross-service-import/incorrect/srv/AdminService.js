const cds = require('@sap/cds')
const { Books } = require('#cds-models/sap/capire/bookshop/CatalogService') // [!code error] wrong service!

module.exports = class AdminService extends cds.ApplicationService { async init() {
  this.after('READ', Books, async () => { })
  // ...
}}
