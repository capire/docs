using { sap.capire.bookshop as my } from '../db/schema';

service CatalogService {
  entity Books as projection on my.Books { * }
    where title IS NOT NULL;
}
