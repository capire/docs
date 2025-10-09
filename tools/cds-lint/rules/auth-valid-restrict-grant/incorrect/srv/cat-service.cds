using { sap.capire.bookshop as my } from '../db/schema';

service CatalogService {
  @(restrict: [{ grant: 'REAAD', to: 'Viewer' }])
  // Invalid item 'REAAD'. Did you mean 'READ'?
  @readonly entity ListOfBooks as projection on Books excluding { descr }; // [!code warning]

  @readonly entity Books as projection on my.Books { *,
    author.name as author
  } excluding { createdBy, modifiedBy };
}