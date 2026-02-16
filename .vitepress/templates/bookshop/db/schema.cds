using { Currency, cuid, managed, sap } from '@sap/cds/common';
namespace sap.capire.bookshop;

entity Books {
  key ID   : Integer;
  author   : Association to Authors @mandatory;
  title    : localized String @mandatory;
  descr    : localized String(2000);
  genre    : Association to Genres;
  stock    : Integer;
  price    : Price;
  currency : Currency;

  total = price * stock;
}

entity Authors {
  key ID       : Integer;
  name         : String @mandatory;
  dateOfBirth  : Date;
  dateOfDeath  : Date;
  placeOfBirth : String;
  placeOfDeath : String;
  books        : Association to many Books on books.author = $self;

  cheapBooks   = books[price < 19.99]; // based on `books` association
  age = years_between(dateOfBirth, coalesce(dateOfDeath, date( $now )));
}

/** Hierarchically organized Code List for Genres */
entity Genres : cuid, sap.common.CodeList {
  parent   : Association to Genres;
  children : Composition of many Genres on children.parent = $self;
}

type Price : Decimal(9,2);

// --------------------------------------------------------------------------------
// Temporary workaround for this situation:
// - Fiori apps in bookstore annotate Books with @fiori.draft.enabled.
// - Because of that .csv data has to eagerly fill in ID_texts column.
annotate Books with @fiori.draft.enabled;
