namespace sap.capire.bookshop;

// Entity name 'books' should start with an uppercase letter.
entity books { // [!code warning]
  key ID : Integer;
  @mandatory title  : localized String(111);
}