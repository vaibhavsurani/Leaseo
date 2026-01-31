export const DEFAULT_LOGIN_REDIRECT = "/";

export const publicRoutes = ["/", "/auth/new-verification", "/products"];

export const authRoutes = [
  "/auth/login",
  "/auth/signup",
  "/auth/vendor-signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/error",
];

export const apiAuthPrefix = "/api/auth";

export const apiRoutes = [
  // all apis of website
  "/api/data",
  "/api/products",
  "/api/cart",
  "/api/orders",
];

// Customer-only protected routes
export const customerRoutes = [
  "/cart",
  "/checkout",
  "/checkout/address",
  "/checkout/payment",
  "/checkout/confirmation",
  "/orders",
  "/profile",
  "/wishlist",
];

// Vendor-only protected routes
export const vendorRoutes = [
  "/vendor/dashboard",
  "/vendor/products",
  "/vendor/orders",
  "/vendor/invoices",
  "/vendor/customers",
  "/vendor/reports",
  "/vendor/settings",
];

// Admin-only protected routes
export const adminRoutes = [
  "/admin/dashboard",
  "/admin/users",
  "/admin/reports",
];

export const privateRoutes = [
  "/dashboard",
  ...customerRoutes,
  ...vendorRoutes,
  ...adminRoutes,
];
