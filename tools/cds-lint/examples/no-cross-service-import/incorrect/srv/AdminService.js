const cds = require('@sap/cds')
const { Books } = require('#cds-models/sap/capire/bookshop/CatalogService') // [!code error]

module.exports = class AdminService extends cds.ApplicationService {
  // …
}