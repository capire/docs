using { sap.capire.bookshop as my } from '../db/schema';

service CatalogService {
  @readonly entity ListOfBooks as projection on Books
  excluding { descr };

  @readonly entity Books as projection on my.Books { *,
    author.name as author
  } excluding { createdBy, modifiedBy }
  actions {
    @restrict: [{grant:'*', to: 'Admin'}]
    // Use `@requires` instead of `@restrict.to` at action `addRating`.
    action addRating (stars: Integer); // [!code warning]
  }
}