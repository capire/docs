using { sap.capire.bookshop as my } from '../db/schema';

service CatalogService {
  @(restrict: [{ grant: 'READ', to: 'Viewer' }])
  @readonly entity ListOfBooks as projection on Books excluding { descr };

  @readonly entity Books as projection on my.Books { *,
    author.name as author
  } excluding { createdBy, modifiedBy };
}