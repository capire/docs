entity sap.capire.bookshop.Books {
  key ID : Integer;
  @mandatory title  : localized String(111);
}

// Order is a reserved keyword in SQLite.
entity ORDER { // [!code warning]
  key ID : Integer;
}