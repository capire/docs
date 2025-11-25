using { sap.capire.bookshop as my } from '../db/schema';

service CatalogService {
  @readonly entity ListOfBooks as projection on Books
  excluding { descr };

  @readonly entity Books as projection on my.Books { *,
    author.name as author
  } excluding { createdBy, modifiedBy };

  @requires: 'authenticated-user'
  action submitOrder ( book: Books:ID, quantity: Integer ) returns { stock: Integer };
  event OrderedBook : { book: Books:ID; quantity: Integer; buyer: String };
  // The grant value provided in @restrict is limited to '*' for function 'CatalogService.getViewsCount'.
  function getViewsCount @(restrict: [{ grant: ['WRITE'], to: 'Admin' }]) () returns Integer; // [!code error]
}