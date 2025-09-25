using { sap.capire.bookshop as my } from '../db/schema';

service CatalogService {
    @(restrict: [{ grants: 'READ', too: 'Viewer', were: 'CreatedBy = $user' }])
  // Misspelled key 'grants'. Did you mean 'grant'?
  // Misspelled key 'too'. Did you mean 'to'?
  // Misspelled key 'were'. Did you mean 'where'?
  @readonly entity ListOfBooks as projection on Books excluding { descr }; // [!code warning]

  @readonly entity Books as projection on my.Books { *,
    author.name as author
  } excluding { createdBy, modifiedBy };
}