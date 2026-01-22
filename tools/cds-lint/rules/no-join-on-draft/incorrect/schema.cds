namespace my;
entity Foo {
  key ID : UUID;
}
entity Bar {
  key ID : UUID;
}
service s {
  @odata.draft.enabled
  entity Foo as projection on my.Foo;
  @odata.draft.enabled
  entity Bar as projection on my.Bar;
  // Do not use draft-enabled entities in views that make use of `JOIN`.
  entity FooBar as select Foo.ID from Foo CROSS JOIN Bar; // [!code warning]
}