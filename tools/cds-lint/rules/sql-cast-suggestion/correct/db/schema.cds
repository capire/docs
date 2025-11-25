namespace sap.capire.bookshop;

entity Books {
  key ID : Integer;
  @mandatory title  : localized String(111);
  @mandatory name   : localized String(111);
}

entity ListOfBooks as SELECT from Books {
  *, ID,
  title || name as name1 : String,
  cast (title || name as String) as name2,
  cast (title || name as String) as name3 : String,
};