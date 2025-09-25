using { sap.capire.bookshop as my } from '../db/schema';

service CatalogService {
  @readonly entity ListOfBooks as projection on Books
  excluding { descr };

  @readonly entity Books as projection on my.Books { *,
    author.name as author
  } excluding { createdBy, modifiedBy };

  @requires: 'authenticated-user'
  function getViewsCount @(restrict: [{ to: 'Admin' }]) () returns Integer;
}