using { sap.capire.bookshop as my } from '../db/schema';

// No explicit restrictions provided on service `AdminService`
// at `@requires`.
service AdminService @(requires:'') { // [!code error]
  entity Books as projection on my.Books;
}