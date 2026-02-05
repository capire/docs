@assert.unique: {
  locale: [ String, String11 ],
  timeslice: [ UUID ],
}
entity Types {
  UUID        : UUID;
  String      : String;
  String11    : String(11);
  Boolean     : Boolean;
  Integer     : Integer;
  Int16       : Int16;
  Int32       : Int32;
  Int64       : Int64;
  UInt8       : UInt8;
  Decimal92   : Decimal(9, 2);
  Decimal     : Decimal;
  Double      : Double;
  DateTime    : DateTime;
  Date        : Date;
  Time        : Time;
  Timestamp   : Timestamp;
  Binary      : Binary;
  Binary1     : Binary(1111);
  LargeBinary : LargeBinary;
  LargeString : LargeString;
  Map         : Map;
  sst         : SomeStringType(11);
// Vector      : Vector;
}
type SomeStringType : String(42);

entity Orders {
 quantity : Integer;
 price : Decimal;
 total : Decimal = price * quantity stored;
}

using { cuid } from '@sap/cds/common';
entity Books : cuid { title : String;
   // managed to-one association // [!code focus]
   author : Association to Authors; // [!code focus]
}
entity Authors : cuid { name : String;
   // unmanaged to-many association: // [!code focus]
   books : Association to many Books on books.author = $self;  // [!code focus]
}

entity ListOfBooks as 
   SELECT title, author.name as author from Books;
entity ListOfAuthors as 
   SELECT name, books.title from Authors;
