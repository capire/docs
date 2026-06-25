namespace sap.capire.bookshop;

entity Books {
  key ID : Integer;
  @mandatory title  : localized String(111);
  @mandatory author : Association to Authors;
}

entity Authors {
  key ID : Integer;
  @mandatory name   : String(111);
  books  : Association to many Books on books.author = $self;
}

view AuthorView as select from Authors {
  // Ambiguous key in 'AuthorView'. Element 'bookIDs' leads to multiple
  // entries so that key 'ID' is not unique.
  key ID, // [!code error]
  books.ID as bookIDs
}