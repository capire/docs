using { sap.capire.bookshop as my } from '../db/schema';

service CatalogService {
  @(restrict: [{ grant: 'READ', to: '', where: 'CreatedBy = $user' }])
  // Missing role on CatalogService.ListOfBooks for `@restrict.to`.
  @readonly entity ListOfBooks as projection on Books excluding { descr }; // [!code warning]

  @readonly entity Books as projection on my.Books { *,
    author.name as author
  } excluding { createdBy, modifiedBy };
}