const cds = require('@sap/cds')

let lastCreatedBook
let lastReadBooks

module.exports = class AdminService extends cds.ApplicationService { async init() {
        this.after('READ', 'Books', async () => {
            // variable from surrounding scope, state is shared between handler calls
            lastReadBooks = await cds.run(SELECT.from('Books'))  // [!code error]
            return lastReadBooks
        })

        this.on('CREATE', 'Books', newBookHandler)
        await super.init()
    }
}

/** @type {import('@sap/cds').CRUDEventHandler.On} */
async function newBookHandler (req) {
    const { name } = req.data
    // variable from surrounding scope, state is shared between handler calls
    lastCreatedBook = await cds.run(INSERT.into('Books').entries({ name }))  // [!code error]
    return lastCreatedBook
}