const cds = require('@sap/cds')
const { Books } = require('#cds-models/sap/capire/bookshop/AdminService') // [!code highlight]

module.exports = class AdminService extends cds.ApplicationService { async init() {
  this.after('READ', Books, async () => { })
  // ...
}}
