namespace sap.capire.bookshop;

@UI.LineItem: [{
    Value          : title,
    @UI.Importance : #High,
}]
entity Books {
  key ID : Integer;
  @mandatory title  : localized String(111);
  @mandatory author : Association to Authors;
}
