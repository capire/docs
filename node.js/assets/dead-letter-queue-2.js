const cds = require('@sap/cds')

module.exports = class OutboxDeadLetterQueueService extends cds.ApplicationService {
  async init() {
    this.before('READ', 'DeadOutboxMessages', function (req) {
      const { maxAttempts } = cds.env.requires.outbox
      req.query.where('attempts >= ', maxAttempts)
    })

    this.on('revive', 'DeadOutboxMessages', async function (req) {
      await UPDATE(req.subject).set({ attempts: 0 })
    })

    this.on('delete', 'DeadOutboxMessages', async function (req) {
      await DELETE.from(req.subject)
    })

    await super.init()
  }
}