namespace enums;

type Status : String enum {
  open   = 'O';
  closed = 'C';
  in_process = 'I';
}

type Priority : Integer enum {
  low      = 1;
  medium   = 2;
  high     = 3;
  critical = 4;
}

// String enum where symbol names are used as values (no explicit val)
type Category : String enum {
  book;
  electronic;
  food;
}

entity Orders {
  key id       : Integer;
  status       : Status;
  priority     : Priority;
  category     : Category;
}
