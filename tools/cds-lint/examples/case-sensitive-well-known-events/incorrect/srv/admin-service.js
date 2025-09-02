const cds = require('@sap/cds')

module.exports = class AdminService extends cds.ApplicationService { async init() {
    this.on('Read', 'Books', () => {}) // [!code error]
}}