namespace sap.capire.bookshop;

entity Books {
  key ID : Integer;
  @mandatory title  : localized String(111);
}

entity Order {
  key ID : Integer;
}