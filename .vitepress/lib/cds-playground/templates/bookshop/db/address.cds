namespace sap.capire.bookshop;

entity Addresses {
  key ID       : Integer;
      city     : Association to Cities;
      street   : String;
}
 
entity Cities {
  key ID       : Integer;
      name     : String;
      country  : String;
}
