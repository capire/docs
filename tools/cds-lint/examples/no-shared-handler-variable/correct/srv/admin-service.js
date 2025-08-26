const cds = require('@sap/cds')

module.exports = class AdminService extends cds.ApplicationService { async init() {
        this.after('READ', 'Books', async () => {
            // local variable only, no state shared between handlers
            const books = await cds.run(SELECT.from('Books'))  // [!code highlight]
            return books
        })

        this.on('CREATE', 'Books', newBookHandler)
        await super.init()
    }
}

/** @type {import('@sap/cds').CRUDEventHandler.On} */
async function newBookHandler (req) {
    const { name } = req.data
    // local variable only, no state shared between handlers
    const newBook = await cds.run(INSERT.into('Books').entries({ name }))  // [!code highlight]
    return newBook
}