using { sap.capire.bookshop as my } from '../db/schema';

service CatalogService @(odata:'/browse') {

  /** For displaying lists of Books */
  @readonly entity ListOfBooks as projection on Books {
    *, currency.symbol as currency,
  }
  excluding { descr };

  /** For display in details pages */
  @readonly entity Books as projection on my.Books { 
    *, // all fields with the following denormalizations:
    author.name as author, 
    genre.name as genre,
  } excluding { createdBy, modifiedBy };

  @requires: 'authenticated-user'
  action submitOrder ( book: Books:ID, quantity: Integer );
}
