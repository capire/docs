// enhance bookshop with more stuff

using { sap.capire.bookshop as my } from './schema';


extend my.Books with {
   status : Status;
}

type Status: String enum {
  presale     = 'PS';
  published    = 'P';
  discontinued = 'D';
}
