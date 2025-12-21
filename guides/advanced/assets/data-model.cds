namespace my.bookshop;

entity Books {
  key ID : Integer;
  title  : String;
  stock  : Integer;
  chapters: Composition of many Chapters on chapters.book=$self;
}

entity Chapters {
  key ID      : UUID;
  book_ID     :	UUID;
  chapterName : String;
  book        : Association to one Books on book.ID=book_ID;
};

extend entity Books with @foo:11 {
  author : String;
};