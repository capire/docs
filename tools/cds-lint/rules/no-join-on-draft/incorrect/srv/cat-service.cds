using { sap.capire.bookshop as my } from '../db/schema';

service CatalogService {
  @readonly entity ListOfBooks as projection on Books
  excluding { descr };

  @odata.draft.enabled
  @readonly entity Books as projection on my.Books { *,
    author.name as author
  } excluding { createdBy, modifiedBy }
  actions {
    @requires: 'Admin'
    action addRating (stars: Integer);
  }

  // Do not use draft-enabled entities in views that make use of `JOIN`.
  entity BooksFromList as select Books.ID from Books CROSS JOIN ListOfBooks; // [!code warning]
}