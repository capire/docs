namespace sap.capire.bookshop;

entity Books {
  key ID : Integer;
  @mandatory title  : localized String(111);
  @mandatory name   : localized String(111);
}

// Potential issue - Missing SQL cast for column expression?
// Potential issue - Missing SQL cast for column expression?
entity ListOfBooks as ( // [!code warning]
  SELECT from Books {
    title || name as name1 : String,
  }
) UNION (
  SELECT from Books {
    title || name as name2 : String,
  }
);