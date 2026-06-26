namespace sap.capire.bookshop;

@UI.LineItem: [{
    Value             : title,
    ![@UI.Importance] : #High, // escaped annotation syntax is unnecessary [!code error]
}]
entity Books {
  key ID : Integer;
  @mandatory title  : localized String(111);
  @mandatory author : Association to Authors;
}
