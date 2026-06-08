const cds = require('@sap/cds')

module.exports = class OutboxDeadLetterQueueService extends cds.ApplicationService {
  async init() {
    this.before('READ', 'DeadOutboxMessages', function (req) {
      const { maxAttempts } = cds.env.requires.outbox
      req.query.where('attempts >= ', maxAttempts)
    })

    await super.init()
  }
}