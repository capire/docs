const cds = require('@sap/cds')
module.exports = class AdminService extends cds.ApplicationService { init() {
  const { Authors } = cds.entities('AdminService')

  this.before (['CREATE', 'UPDATE'], Authors, async (req) => {
    await SELECT`ID`.from `Authors`.where (`name = ${req.data.name}`) // [!code error]
  })

  return super.init()
}}
