namespace sap.capire.bookshop;

entity Books {
  key ID : Integer;
  @cds.java.name: 'isNew'
  new : Boolean;
};
