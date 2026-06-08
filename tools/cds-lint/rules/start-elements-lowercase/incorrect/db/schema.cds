namespace sap.capire.bookshop;

entity Books {
  key ID : Integer;
  // Element name 'sap.capire.bookshop.Books.Title' should start
  // with a lowercase letter.
  @mandatory Title  : localized String(111); // [!code warning]
}