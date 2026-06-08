using { sap.capire.orders, OrdersService, sap.common } from 'base-app';

namespace x_bookshop.extension;

extend orders.Orders with {
  x_priority    : String;
  x_SalesRegion : Association to x_SalesRegion;
  // Element 'other' in 'sap.capire.orders.Orders' must start with x_.
  other         : String; // [!code warning]
}

extend service OrdersService with {
  // 'OrdersService.x_SalesRegion' exceeds extension limit of 1
  // for Service 'OrdersService'.
  entity x_SalesRegion as projection on extension.x_SalesRegion; // [!code warning]
  // 'OrdersService.x_MyOrders' exceeds extension limit of 1
  // for Service 'OrdersService'.
  entity x_MyOrders as projection on orders.Orders; // [!code warning]
}

@sql.append: 'foo'
// Annotation '@sql.append' in 'x_bookshop.extension.x_SalesRegion'
// is not supported in extensions
entity x_SalesRegion: common.CodeList { // [!code warning]
  key regionCode : String(11);
}
