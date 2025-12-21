using my.bookshop from './data-model';
service CatalogService {
  @odata.draft.enabled:true
  entity Books as projection on bookshop.Books;

  entity Chapters as projection on bookshop.Chapters;
}
