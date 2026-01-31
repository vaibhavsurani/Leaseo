"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  OrderStatus,
  QuotationStatus,
  InvoiceStatus,
  RentalPeriodType,
  PaymentType,
  PaymentStatus,
} from "@prisma/client";
import { cancelOrderReservations } from "@/lib/availability";

// ==================== TYPES ====================

export type VendorStats = {
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  totalRevenue: number;
  pendingOrders: number;
  activeRentals: number;
  draftInvoices: number;
  overdueInvoices: number;
};

export type VendorOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: Date;
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
  items: {
    id: string;
    productId: string;
    productName: string;
    productImage: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    rentalStartDate: Date;
    rentalEndDate: Date;
  }[];
  address: {
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
  } | null;
};

export type VendorQuotation = {
  id: string;
  quotationNumber: string;
  status: QuotationStatus;
  totalAmount: number;
  validUntil: Date;
  createdAt: Date;
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
  items: {
    id: string;
    productId: string;
    productName: string;
    productImage: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    rentalStartDate: Date;
    rentalEndDate: Date;
  }[];
  address: {
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
  } | null;
};

export type VendorProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  basePrice: number;
  costPrice: number;
  quantity: number;
  isPublished: boolean;
  isRentable: boolean;
  category: { id: string; name: string } | null;
  images: { id: string; url: string; isPrimary: boolean }[];
  createdAt: Date;
};

export type VendorCustomer = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: Date | null;
  createdAt: Date;
};

export type VendorInvoice = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueDate: Date;
  createdAt: Date;
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  order: {
    id: string;
    orderNumber: string;
  };
  items: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
};

// ==================== HELPER FUNCTIONS ====================

async function getVendorSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  if (session.user.role !== "VENDOR" && session.user.role !== "ADMIN") {
    throw new Error("Access denied. Vendor role required.");
  }
  return session;
}

// ==================== DASHBOARD ====================

export async function getVendorDashboardStats(): Promise<{
  success: boolean;
  data?: VendorStats;
  error?: string;
}> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    // Get vendor's product IDs
    const vendorProducts = await db.product.findMany({
      where: { vendorId },
      select: { id: true },
    });
    const productIds = vendorProducts.map((p) => p.id);

    // Get orders containing vendor's products
    const orders = await db.rentalOrder.findMany({
      where: {
        items: {
          some: {
            productId: { in: productIds },
          },
        },
      },
      include: {
        items: {
          where: { productId: { in: productIds } },
        },
      },
    });

    // Calculate stats
    const totalOrders = orders.length;
    const totalProducts = productIds.length;

    // Get unique customers
    const customerIds = [...new Set(orders.map((o) => o.customerId))];
    const totalCustomers = customerIds.length;

    // Calculate revenue from vendor's products only
    const totalRevenue = orders.reduce((sum, order) => {
      const orderTotal = order.items.reduce(
        (itemSum, item) => itemSum + Number(item.totalPrice),
        0,
      );
      return sum + orderTotal;
    }, 0);

    const pendingOrders = orders.filter(
      (o) => o.status === "DRAFT" || o.status === "CONFIRMED",
    ).length;

    const activeRentals = orders.filter(
      (o) => o.status === "IN_PROGRESS",
    ).length;

    // Get invoice stats
    const invoices = await db.invoice.findMany({
      where: {
        order: {
          items: {
            some: {
              productId: { in: productIds },
            },
          },
        },
      },
    });

    const draftInvoices = invoices.filter((i) => i.status === "DRAFT").length;
    const overdueInvoices = invoices.filter(
      (i) => i.status === "OVERDUE",
    ).length;

    return {
      success: true,
      data: {
        totalOrders,
        totalProducts,
        totalCustomers,
        totalRevenue,
        pendingOrders,
        activeRentals,
        draftInvoices,
        overdueInvoices,
      },
    };
  } catch (error) {
    console.error("Error fetching vendor stats:", error);
    return { success: false, error: "Failed to fetch dashboard stats" };
  }
}

export async function getVendorRecentOrders(limit = 5): Promise<{
  success: boolean;
  data?: VendorOrder[];
  error?: string;
}> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    const vendorProducts = await db.product.findMany({
      where: { vendorId },
      select: { id: true },
    });
    const productIds = vendorProducts.map((p) => p.id);

    const orders = await db.rentalOrder.findMany({
      where: {
        items: {
          some: {
            productId: { in: productIds },
          },
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        items: {
          where: { productId: { in: productIds } },
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
        address: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const formattedOrders: VendorOrder[] = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
      customer: order.customer,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images[0]?.url || null,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        rentalStartDate: item.rentalStartDate,
        rentalEndDate: item.rentalEndDate,
      })),
      address: order.address
        ? {
            addressLine1: order.address.addressLine1,
            addressLine2: order.address.addressLine2,
            city: order.address.city,
            state: order.address.state,
            postalCode: order.address.postalCode,
          }
        : null,
    }));

    return { success: true, data: formattedOrders };
  } catch (error) {
    console.error("Error fetching recent orders:", error);
    return { success: false, error: "Failed to fetch recent orders" };
  }
}

// ==================== ORDERS ====================

export async function getVendorOrders(filters?: {
  status?: OrderStatus;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: {
    orders: VendorOrder[];
    total: number;
    page: number;
    totalPages: number;
  };
  error?: string;
}> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;
    const { status, search, page = 1, limit = 10 } = filters || {};

    const vendorProducts = await db.product.findMany({
      where: { vendorId },
      select: { id: true },
    });
    const productIds = vendorProducts.map((p) => p.id);

    const where: any = {
      items: {
        some: {
          productId: { in: productIds },
        },
      },
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customer: { firstName: { contains: search, mode: "insensitive" } } },
        { customer: { lastName: { contains: search, mode: "insensitive" } } },
        { customer: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const total = await db.rentalOrder.count({ where });
    const totalPages = Math.ceil(total / limit);

    const orders = await db.rentalOrder.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        items: {
          where: { productId: { in: productIds } },
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
        address: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const formattedOrders: VendorOrder[] = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
      customer: order.customer,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images[0]?.url || null,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        rentalStartDate: item.rentalStartDate,
        rentalEndDate: item.rentalEndDate,
      })),
      address: order.address
        ? {
            addressLine1: order.address.addressLine1,
            addressLine2: order.address.addressLine2,
            city: order.address.city,
            state: order.address.state,
            postalCode: order.address.postalCode,
          }
        : null,
    }));

    return {
      success: true,
      data: { orders: formattedOrders, total, page, totalPages },
    };
  } catch (error) {
    console.error("Error fetching vendor orders:", error);
    return { success: false, error: "Failed to fetch orders" };
  }
}

export async function getVendorQuotations(filters?: {
  status?: QuotationStatus;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: {
    quotations: VendorQuotation[];
    total: number;
    page: number;
    totalPages: number;
  };
  error?: string;
}> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;
    const { status, search, page = 1, limit = 10 } = filters || {};

    // Get vendor's product IDs
    const vendorProducts = await db.product.findMany({
      where: { vendorId },
      select: { id: true },
    });
    const productIds = vendorProducts.map((p) => p.id);

    const where: any = {
      items: {
        some: {
          productId: { in: productIds },
        },
      },
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { quotationNumber: { contains: search, mode: "insensitive" } },
        { customer: { firstName: { contains: search, mode: "insensitive" } } },
        { customer: { lastName: { contains: search, mode: "insensitive" } } },
        { customer: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const total = await db.quotation.count({ where });
    const totalPages = Math.ceil(total / limit);

    const quotations = await db.quotation.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        items: {
          where: { productId: { in: productIds } },
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
        address: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const formattedQuotations: VendorQuotation[] = quotations.map(
      (quotation) => ({
        id: quotation.id,
        quotationNumber: quotation.quotationNumber,
        status: quotation.status,
        totalAmount: Number(quotation.totalAmount),
        validUntil: quotation.validUntil,
        createdAt: quotation.createdAt,
        customer: quotation.customer,
        items: quotation.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          productImage: item.product.images[0]?.url || null,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          rentalStartDate: item.rentalStartDate,
          rentalEndDate: item.rentalEndDate,
        })),
        address: quotation.address
          ? {
              addressLine1: quotation.address.addressLine1,
              addressLine2: quotation.address.addressLine2,
              city: quotation.address.city,
              state: quotation.address.state,
              postalCode: quotation.address.postalCode,
            }
          : null,
      }),
    );

    return {
      success: true,
      data: { quotations: formattedQuotations, total, page, totalPages },
    };
  } catch (error) {
    console.error("Error fetching vendor quotations:", error);
    return { success: false, error: "Failed to fetch quotations" };
  }
}

export async function getVendorOrderById(orderId: string): Promise<{
  success: boolean;
  data?: VendorOrder;
  error?: string;
}> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    const vendorProducts = await db.product.findMany({
      where: { vendorId },
      select: { id: true },
    });
    const productIds = vendorProducts.map((p) => p.id);

    const order = await db.rentalOrder.findFirst({
      where: {
        id: orderId,
        items: {
          some: {
            productId: { in: productIds },
          },
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        items: {
          where: { productId: { in: productIds } },
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
        address: true,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    const formattedOrder: VendorOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
      customer: order.customer,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images[0]?.url || null,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        rentalStartDate: item.rentalStartDate,
        rentalEndDate: item.rentalEndDate,
      })),
      address: order.address
        ? {
            addressLine1: order.address.addressLine1,
            addressLine2: order.address.addressLine2,
            city: order.address.city,
            state: order.address.state,
            postalCode: order.address.postalCode,
          }
        : null,
    };

    return { success: true, data: formattedOrder };
  } catch (error) {
    console.error("Error fetching order:", error);
    return { success: false, error: "Failed to fetch order" };
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<{
  success: boolean;
  error?: string;
  requiresRefund?: boolean;
  paymentId?: string;
  amount?: number;
}> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    // Verify the order contains vendor's products
    const vendorProducts = await db.product.findMany({
      where: { vendorId },
      select: { id: true },
    });
    const productIds = vendorProducts.map((p) => p.id);

    const order = await db.rentalOrder.findFirst({
      where: {
        id: orderId,
        items: {
          some: {
            productId: { in: productIds },
          },
        },
      },
      include: {
        items: true,
        payments: {
          where: { status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      return { success: false, error: "Order not found or access denied" };
    }

    // Get previous status to check if we're cancelling
    const previousStatus = order.status;

    // If cancelling and there's a Razorpay payment, inform that refund is needed
    if (status === "CANCELLED" && previousStatus !== "CANCELLED") {
      const razorpayPayment = order.payments.find((p) => p.transactionId);

      if (
        razorpayPayment &&
        razorpayPayment.transactionId &&
        Number(razorpayPayment.amount) > 0
      ) {
        // Return that refund is required - client should call refund API
        return {
          success: false,
          requiresRefund: true,
          paymentId: razorpayPayment.transactionId,
          amount: Number(razorpayPayment.amount),
          error: "This order has a payment. Refund will be processed.",
        };
      }
    }

    await db.rentalOrder.update({
      where: { id: orderId },
      data: {
        status,
        confirmedAt: status === "CONFIRMED" ? new Date() : undefined,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
        cancelledAt: status === "CANCELLED" ? new Date() : undefined,
      },
    });

    // Cancel reservations if order is being cancelled (frees up dates)
    if (status === "CANCELLED" && previousStatus !== "CANCELLED") {
      await cancelOrderReservations(orderId);
    }

    revalidatePath("/vendor/orders");
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("Error updating order status:", error);
    return { success: false, error: "Failed to update order status" };
  }
}

// ==================== PRODUCTS ====================

export async function getVendorProducts(filters?: {
  search?: string;
  isPublished?: boolean;
  categoryId?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: {
    products: VendorProduct[];
    total: number;
    page: number;
    totalPages: number;
  };
  error?: string;
}> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;
    const {
      search,
      isPublished,
      categoryId,
      page = 1,
      limit = 12,
    } = filters || {};

    const where: any = { vendorId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const total = await db.product.count({ where });
    const totalPages = Math.ceil(total / limit);

    const products = await db.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const formattedProducts: VendorProduct[] = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      basePrice: Number(product.basePrice),
      costPrice: Number(product.costPrice),
      quantity: product.quantity,
      isPublished: product.isPublished,
      isRentable: product.isRentable,
      category: product.category,
      images: product.images.map((img) => ({
        id: img.id,
        url: img.url,
        isPrimary: img.isPrimary,
      })),
      createdAt: product.createdAt,
    }));

    return {
      success: true,
      data: { products: formattedProducts, total, page, totalPages },
    };
  } catch (error) {
    console.error("Error fetching vendor products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

export async function getVendorProductById(productId: string): Promise<{
  success: boolean;
  data?: VendorProduct & {
    description: string | null;
    shortDescription: string | null;
    securityDeposit: number;
    minRentalPeriod: number;
    maxRentalPeriod: number | null;
    rentalPricing: {
      id: string;
      periodType: RentalPeriodType;
      duration: number;
      price: number;
    }[];
  };
  error?: string;
}> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    const product = await db.product.findFirst({
      where: { id: productId, vendorId },
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: "asc" } },
        rentalPricing: true,
      },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    return {
      success: true,
      data: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: product.description,
        shortDescription: product.shortDescription,
        basePrice: Number(product.basePrice),
        costPrice: Number(product.costPrice),
        quantity: product.quantity,
        isPublished: product.isPublished,
        isRentable: product.isRentable,
        securityDeposit: Number(product.securityDeposit),
        minRentalPeriod: product.minRentalPeriod,
        maxRentalPeriod: product.maxRentalPeriod,
        category: product.category,
        images: product.images.map((img) => ({
          id: img.id,
          url: img.url,
          isPrimary: img.isPrimary,
        })),
        rentalPricing: product.rentalPricing.map((rp) => ({
          id: rp.id,
          periodType: rp.periodType,
          duration: rp.duration,
          price: Number(rp.price),
        })),
        createdAt: product.createdAt,
      },
    };
  } catch (error) {
    console.error("Error fetching product:", error);
    return { success: false, error: "Failed to fetch product" };
  }
}

export async function createProduct(data: {
  name: string;
  description?: string;
  shortDescription?: string;
  sku: string;
  categoryId?: string;
  costPrice: number;
  basePrice: number;
  securityDeposit?: number;
  quantity: number;
  minRentalPeriod?: number;
  maxRentalPeriod?: number;
  isRentable?: boolean;
  isPublished?: boolean;
  images?: { url: string; isPrimary: boolean }[];
  rentalPricing?: {
    periodType: RentalPeriodType;
    duration: number;
    price: number;
  }[];
}): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    // Generate slug from name
    const slug =
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Date.now();

    const product = await db.product.create({
      data: {
        vendorId,
        name: data.name,
        slug,
        description: data.description,
        shortDescription: data.shortDescription,
        sku: data.sku,
        categoryId: data.categoryId || null,
        costPrice: data.costPrice,
        basePrice: data.basePrice,
        securityDeposit: data.securityDeposit || 0,
        quantity: data.quantity,
        minRentalPeriod: data.minRentalPeriod || 1,
        maxRentalPeriod: data.maxRentalPeriod || null,
        isRentable: data.isRentable ?? true,
        isPublished: data.isPublished ?? false,
        images: data.images
          ? {
              create: data.images.map((img, idx) => ({
                url: img.url,
                isPrimary: img.isPrimary,
                sortOrder: idx,
              })),
            }
          : undefined,
        rentalPricing: data.rentalPricing
          ? {
              create: data.rentalPricing.map((rp) => ({
                periodType: rp.periodType,
                duration: rp.duration,
                price: rp.price,
              })),
            }
          : undefined,
      },
    });

    revalidatePath("/vendor/products");
    return { success: true, data: { id: product.id } };
  } catch (error: any) {
    console.error("Error creating product:", error);
    if (error.code === "P2002") {
      return { success: false, error: "SKU already exists" };
    }
    return { success: false, error: "Failed to create product" };
  }
}

export async function updateProduct(
  productId: string,
  data: {
    name?: string;
    description?: string;
    shortDescription?: string;
    categoryId?: string;
    costPrice?: number;
    basePrice?: number;
    securityDeposit?: number;
    quantity?: number;
    minRentalPeriod?: number;
    maxRentalPeriod?: number | null;
    isRentable?: boolean;
    isPublished?: boolean;
    images?: { url: string; isPrimary: boolean }[];
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    const product = await db.product.findFirst({
      where: { id: productId, vendorId },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    const { images, ...productData } = data;

    await db.product.update({
      where: { id: productId },
      data: {
        ...productData,
        categoryId: productData.categoryId || null,
      },
    });

    // Handle images if provided
    if (images !== undefined) {
      // Delete existing images
      await db.productImage.deleteMany({
        where: { productId },
      });

      // Create new images
      if (images.length > 0) {
        await db.productImage.createMany({
          data: images.map((img, index) => ({
            productId,
            url: img.url,
            isPrimary: img.isPrimary || index === 0,
          })),
        });
      }
    }

    revalidatePath("/vendor/products");
    return { success: true };
  } catch (error) {
    console.error("Error updating product:", error);
    return { success: false, error: "Failed to update product" };
  }
}

export async function deleteProduct(
  productId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    const product = await db.product.findFirst({
      where: { id: productId, vendorId },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    await db.product.delete({ where: { id: productId } });

    revalidatePath("/vendor/products");
    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: "Failed to delete product" };
  }
}

export async function toggleProductPublish(
  productId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    const product = await db.product.findFirst({
      where: { id: productId, vendorId },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    await db.product.update({
      where: { id: productId },
      data: { isPublished: !product.isPublished },
    });

    revalidatePath("/vendor/products");
    return { success: true };
  } catch (error) {
    console.error("Error toggling product publish:", error);
    return { success: false, error: "Failed to update product" };
  }
}

// ==================== CUSTOMERS ====================

export async function getVendorCustomers(filters?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: {
    customers: VendorCustomer[];
    total: number;
    page: number;
    totalPages: number;
  };
  error?: string;
}> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;
    const { search, page = 1, limit = 12 } = filters || {};

    // Get vendor's product IDs
    const vendorProducts = await db.product.findMany({
      where: { vendorId },
      select: { id: true },
    });
    const productIds = vendorProducts.map((p) => p.id);

    // Get unique customer IDs who ordered vendor's products
    const ordersWithCustomers = await db.rentalOrder.findMany({
      where: {
        items: {
          some: {
            productId: { in: productIds },
          },
        },
      },
      select: { customerId: true },
      distinct: ["customerId"],
    });

    const customerIds = ordersWithCustomers.map((o) => o.customerId);

    const where: any = {
      id: { in: customerIds },
      role: "CUSTOMER",
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const total = await db.user.count({ where });
    const totalPages = Math.ceil(total / limit);

    const customers = await db.user.findMany({
      where,
      include: {
        rentalOrders: {
          where: {
            items: {
              some: {
                productId: { in: productIds },
              },
            },
          },
          include: {
            items: {
              where: { productId: { in: productIds } },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const formattedCustomers: VendorCustomer[] = customers.map((customer) => {
      const totalSpent = customer.rentalOrders.reduce((sum, order) => {
        const orderTotal = order.items.reduce(
          (itemSum, item) => itemSum + Number(item.totalPrice),
          0,
        );
        return sum + orderTotal;
      }, 0);

      return {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        image: customer.image,
        totalOrders: customer.rentalOrders.length,
        totalSpent,
        lastOrderDate: customer.rentalOrders[0]?.createdAt || null,
        createdAt: customer.createdAt,
      };
    });

    return {
      success: true,
      data: { customers: formattedCustomers, total, page, totalPages },
    };
  } catch (error) {
    console.error("Error fetching vendor customers:", error);
    return { success: false, error: "Failed to fetch customers" };
  }
}

// ==================== INVOICES ====================

export async function getVendorInvoices(filters?: {
  status?: InvoiceStatus;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: {
    invoices: VendorInvoice[];
    total: number;
    page: number;
    totalPages: number;
  };
  error?: string;
}> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;
    const { status, search, page = 1, limit = 10 } = filters || {};

    const vendorProducts = await db.product.findMany({
      where: { vendorId },
      select: { id: true },
    });
    const productIds = vendorProducts.map((p) => p.id);

    const where: any = {
      order: {
        items: {
          some: {
            productId: { in: productIds },
          },
        },
      },
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { customer: { firstName: { contains: search, mode: "insensitive" } } },
        { customer: { lastName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const total = await db.invoice.count({ where });
    const totalPages = Math.ceil(total / limit);

    const invoices = await db.invoice.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const formattedInvoices: VendorInvoice[] = invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      paidAmount: Number(invoice.paidAmount),
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt,
      customer: invoice.customer,
      order: invoice.order,
      items: invoice.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    }));

    return {
      success: true,
      data: { invoices: formattedInvoices, total, page, totalPages },
    };
  } catch (error) {
    console.error("Error fetching vendor invoices:", error);
    return { success: false, error: "Failed to fetch invoices" };
  }
}

export async function createInvoice(
  orderId: string,
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    // Verify the order belongs to vendor
    const vendorProducts = await db.product.findMany({
      where: { vendorId },
      select: { id: true },
    });
    const productIds = vendorProducts.map((p) => p.id);

    const order = await db.rentalOrder.findFirst({
      where: {
        id: orderId,
        items: {
          some: {
            productId: { in: productIds },
          },
        },
      },
      include: {
        items: {
          where: { productId: { in: productIds } },
          include: { product: true },
        },
        payments: {
          where: { status: "COMPLETED" },
        },
      },
    });

    if (!order) {
      return { success: false, error: "Order not found or access denied" };
    }

    // Generate invoice number
    const invoiceCount = await db.invoice.count();
    const invoiceNumber = `INV/${new Date().getFullYear()}/${String(invoiceCount + 1).padStart(4, "0")}`;

    // Calculate totals from vendor's items only
    const subtotal = order.items.reduce(
      (sum, item) => sum + Number(item.totalPrice),
      0,
    );
    const taxAmount = subtotal * 0.18; // 18% GST
    const totalAmount = subtotal + taxAmount;

    // Get paid amount from order's paidAmount or calculate from completed payments
    const paidAmount =
      Number(order.paidAmount) > 0
        ? Number(order.paidAmount)
        : order.payments.reduce(
            (sum, payment) => sum + Number(payment.amount),
            0,
          );

    // Determine invoice status based on payment
    const invoiceStatus =
      paidAmount >= totalAmount
        ? "PAID"
        : paidAmount > 0
          ? "PARTIALLY_PAID"
          : "DRAFT";

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        orderId: order.id,
        customerId: order.customerId,
        status: invoiceStatus,
        subtotal,
        taxAmount,
        totalAmount,
        paidAmount,
        paidAt: paidAmount >= totalAmount ? new Date() : null,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        items: {
          create: order.items.map((item) => ({
            description: item.product.name,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
          })),
        },
      },
    });

    revalidatePath("/vendor/invoices");
    return { success: true, data: { id: invoice.id } };
  } catch (error) {
    console.error("Error creating invoice:", error);
    return { success: false, error: "Failed to create invoice" };
  }
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    // Verify invoice belongs to vendor
    const vendorProducts = await db.product.findMany({
      where: { vendorId },
      select: { id: true },
    });
    const productIds = vendorProducts.map((p) => p.id);

    const invoice = await db.invoice.findFirst({
      where: {
        id: invoiceId,
        order: {
          items: {
            some: {
              productId: { in: productIds },
            },
          },
        },
      },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found or access denied" };
    }

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status,
        paidAt: status === "PAID" ? new Date() : undefined,
      },
    });

    revalidatePath("/vendor/invoices");
    return { success: true };
  } catch (error) {
    console.error("Error updating invoice status:", error);
    return { success: false, error: "Failed to update invoice status" };
  }
}

// ==================== CATEGORIES (Read-only) ====================

export async function getCategories(): Promise<{
  success: boolean;
  data?: { id: string; name: string; slug: string }[];
  error?: string;
}> {
  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });

    return { success: true, data: categories };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return { success: false, error: "Failed to fetch categories" };
  }
}

// ==================== NEW ORDER (Quotation to Order) ====================

export async function createQuotation(data: {
  customerId: string;
  addressId?: string;
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
    rentalStartDate: Date;
    rentalEndDate: Date;
    periodType: RentalPeriodType;
    periodDuration: number;
  }[];
  notes?: string;
}): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    // Verify all products belong to vendor
    const productIds = data.items.map((item) => item.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds }, vendorId },
      include: { rentalPricing: true },
    });

    if (products.length !== productIds.length) {
      return {
        success: false,
        error: "Some products not found or access denied",
      };
    }

    // Calculate prices
    const itemsWithPrices = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const pricing = product.rentalPricing.find(
        (p) => p.periodType === item.periodType,
      );
      const unitPrice = pricing
        ? Number(pricing.price)
        : Number(product.basePrice);
      const totalPrice = unitPrice * item.quantity * item.periodDuration;

      return {
        ...item,
        unitPrice,
        totalPrice,
      };
    });

    const subtotal = itemsWithPrices.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );
    const taxAmount = subtotal * 0.18;
    const totalAmount = subtotal + taxAmount;
    const securityDeposit = products.reduce(
      (sum, p) => sum + Number(p.securityDeposit),
      0,
    );

    // Generate quotation number
    const quotationCount = await db.quotation.count();
    const quotationNumber = `Q${String(quotationCount + 1).padStart(5, "0")}`;

    const quotation = await db.quotation.create({
      data: {
        quotationNumber,
        customerId: data.customerId,
        addressId: data.addressId || null,
        status: "DRAFT",
        subtotal,
        taxAmount,
        totalAmount,
        securityDeposit,
        notes: data.notes,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        items: {
          create: itemsWithPrices.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            rentalStartDate: item.rentalStartDate,
            rentalEndDate: item.rentalEndDate,
            periodType: item.periodType,
            periodDuration: item.periodDuration,
          })),
        },
      },
    });

    revalidatePath("/vendor/orders");
    return { success: true, data: { id: quotation.id } };
  } catch (error) {
    console.error("Error creating quotation:", error);
    return { success: false, error: "Failed to create quotation" };
  }
}

export async function sendQuotationToCustomer(
  quotationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    // Verify quotation exists and belongs to vendor's products
    const quotation = await db.quotation.findFirst({
      where: { id: quotationId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    if (!quotation) {
      return { success: false, error: "Quotation not found" };
    }

    // Verify at least one item belongs to vendor
    const hasVendorProduct = quotation.items.some(
      (item) => item.product.vendorId === vendorId,
    );

    if (!hasVendorProduct) {
      return { success: false, error: "Access denied" };
    }

    if (quotation.status !== "DRAFT") {
      return { success: false, error: "Quotation has already been sent" };
    }

    // Update quotation status to SENT
    await db.quotation.update({
      where: { id: quotationId },
      data: {
        status: "SENT",
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Reset validity to 7 days from now
      },
    });

    // TODO: Send email notification to customer
    // await sendQuotationEmail(quotation.customer.email, quotation);

    revalidatePath("/vendor/orders");
    return { success: true };
  } catch (error) {
    console.error("Error sending quotation:", error);
    return { success: false, error: "Failed to send quotation" };
  }
}

export async function convertQuotationToOrder(
  quotationId: string,
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    const quotation = await db.quotation.findFirst({
      where: { id: quotationId },
      include: { items: true },
    });

    if (!quotation) {
      return { success: false, error: "Quotation not found" };
    }

    // Generate order number
    const orderCount = await db.rentalOrder.count();
    const orderNumber = `SO${String(orderCount + 1).padStart(5, "0")}`;

    const order = await db.rentalOrder.create({
      data: {
        orderNumber,
        quotationId: quotation.id,
        customerId: quotation.customerId,
        addressId: quotation.addressId,
        status: "DRAFT",
        subtotal: quotation.subtotal,
        taxAmount: quotation.taxAmount,
        totalAmount: quotation.totalAmount,
        securityDeposit: quotation.securityDeposit,
        notes: quotation.notes,
        items: {
          create: quotation.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            rentalStartDate: item.rentalStartDate,
            rentalEndDate: item.rentalEndDate,
            periodType: item.periodType,
            periodDuration: item.periodDuration,
          })),
        },
      },
    });

    // Update quotation status
    await db.quotation.update({
      where: { id: quotationId },
      data: { status: "CONFIRMED" },
    });

    revalidatePath("/vendor/orders");
    return { success: true, data: { id: order.id } };
  } catch (error) {
    console.error("Error converting quotation:", error);
    return { success: false, error: "Failed to convert quotation to order" };
  }
}

// ==================== ATTRIBUTES & VARIANTS ====================

export type ProductAttributeData = {
  id: string;
  name: string;
  values: { id: string; value: string }[];
};

export type ProductVariantData = {
  id: string;
  sku: string;
  name: string | null;
  priceModifier: number;
  quantity: number;
  isActive: boolean;
  attributes: {
    attributeId: string;
    attributeName: string;
    valueId: string;
    value: string;
  }[];
};

// Get all available attributes
export async function getAttributes(): Promise<{
  success: boolean;
  data?: ProductAttributeData[];
  error?: string;
}> {
  try {
    await getVendorSession();

    const attributes = await db.productAttribute.findMany({
      include: {
        values: {
          orderBy: { value: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: attributes.map((attr) => ({
        id: attr.id,
        name: attr.name,
        values: attr.values.map((v) => ({ id: v.id, value: v.value })),
      })),
    };
  } catch (error) {
    console.error("Error fetching attributes:", error);
    return { success: false, error: "Failed to fetch attributes" };
  }
}

// Create a new attribute
export async function createAttribute(name: string): Promise<{
  success: boolean;
  data?: { id: string; name: string };
  error?: string;
}> {
  try {
    await getVendorSession();

    const attribute = await db.productAttribute.create({
      data: { name },
    });

    return {
      success: true,
      data: { id: attribute.id, name: attribute.name },
    };
  } catch (error: any) {
    console.error("Error creating attribute:", error);
    if (error.code === "P2002") {
      return { success: false, error: "Attribute already exists" };
    }
    return { success: false, error: "Failed to create attribute" };
  }
}

// Add value to an attribute
export async function addAttributeValue(
  attributeId: string,
  value: string,
): Promise<{
  success: boolean;
  data?: { id: string; value: string };
  error?: string;
}> {
  try {
    await getVendorSession();

    const attributeValue = await db.productAttributeValue.create({
      data: { attributeId, value },
    });

    return {
      success: true,
      data: { id: attributeValue.id, value: attributeValue.value },
    };
  } catch (error: any) {
    console.error("Error adding attribute value:", error);
    if (error.code === "P2002") {
      return {
        success: false,
        error: "Value already exists for this attribute",
      };
    }
    return { success: false, error: "Failed to add attribute value" };
  }
}

// Get variants for a product
export async function getProductVariants(productId: string): Promise<{
  success: boolean;
  data?: ProductVariantData[];
  error?: string;
}> {
  try {
    await getVendorSession();

    const variants = await db.productVariant.findMany({
      where: { productId },
      include: {
        attributes: {
          include: {
            attributeValue: {
              include: {
                attribute: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      success: true,
      data: variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        priceModifier: Number(v.priceModifier),
        quantity: v.quantity,
        isActive: v.isActive,
        attributes: v.attributes.map((a) => ({
          attributeId: a.attributeValue.attributeId,
          attributeName: a.attributeValue.attribute.name,
          valueId: a.attributeValueId,
          value: a.attributeValue.value,
        })),
      })),
    };
  } catch (error) {
    console.error("Error fetching variants:", error);
    return { success: false, error: "Failed to fetch variants" };
  }
}

// Create a product variant
export async function createProductVariant(data: {
  productId: string;
  sku: string;
  name?: string;
  priceModifier?: number;
  quantity?: number;
  attributeValueIds: string[];
}): Promise<{
  success: boolean;
  data?: { id: string };
  error?: string;
}> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    // Verify product belongs to vendor
    const product = await db.product.findFirst({
      where: { id: data.productId, vendorId },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    const variant = await db.productVariant.create({
      data: {
        productId: data.productId,
        sku: data.sku,
        name: data.name || null,
        priceModifier: data.priceModifier || 0,
        quantity: data.quantity || 0,
        attributes: {
          create: data.attributeValueIds.map((valueId) => ({
            attributeValueId: valueId,
          })),
        },
      },
    });

    revalidatePath(`/vendor/products/${data.productId}`);
    return { success: true, data: { id: variant.id } };
  } catch (error: any) {
    console.error("Error creating variant:", error);
    if (error.code === "P2002") {
      return { success: false, error: "Variant SKU already exists" };
    }
    return { success: false, error: "Failed to create variant" };
  }
}

// Update a product variant
export async function updateProductVariant(
  variantId: string,
  data: {
    name?: string;
    priceModifier?: number;
    quantity?: number;
    isActive?: boolean;
    attributeValueIds?: string[];
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    // Verify variant belongs to vendor's product
    const variant = await db.productVariant.findFirst({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant || variant.product.vendorId !== vendorId) {
      return { success: false, error: "Variant not found" };
    }

    const { attributeValueIds, ...updateData } = data;

    await db.productVariant.update({
      where: { id: variantId },
      data: updateData,
    });

    // Update attributes if provided
    if (attributeValueIds) {
      // Delete existing attributes
      await db.productVariantAttribute.deleteMany({
        where: { variantId },
      });

      // Create new attributes
      await db.productVariantAttribute.createMany({
        data: attributeValueIds.map((valueId) => ({
          variantId,
          attributeValueId: valueId,
        })),
      });
    }

    revalidatePath(`/vendor/products/${variant.productId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating variant:", error);
    return { success: false, error: "Failed to update variant" };
  }
}

// Delete a product variant
export async function deleteProductVariant(variantId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    // Verify variant belongs to vendor's product
    const variant = await db.productVariant.findFirst({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant || variant.product.vendorId !== vendorId) {
      return { success: false, error: "Variant not found" };
    }

    await db.productVariant.delete({
      where: { id: variantId },
    });

    revalidatePath(`/vendor/products/${variant.productId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting variant:", error);
    return { success: false, error: "Failed to delete variant" };
  }
}

// Generate variants from attribute combinations
export async function generateVariants(
  productId: string,
  attributeValueGroups: { attributeId: string; valueIds: string[] }[],
): Promise<{
  success: boolean;
  data?: { count: number };
  error?: string;
}> {
  try {
    const session = await getVendorSession();
    const vendorId = session.user.id;

    // Verify product belongs to vendor
    const product = await db.product.findFirst({
      where: { id: productId, vendorId },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    // Get attribute values with names for SKU generation
    const attributeValues = await db.productAttributeValue.findMany({
      where: {
        id: {
          in: attributeValueGroups.flatMap((g) => g.valueIds),
        },
      },
      include: { attribute: true },
    });

    // Generate all combinations
    const combinations = generateCombinations(
      attributeValueGroups.map((g) => g.valueIds),
    );

    // Create variants for each combination
    let count = 0;
    for (const combination of combinations) {
      // Generate SKU from product SKU and attribute values
      const valueCodes = combination
        .map((valueId) => {
          const av = attributeValues.find((v) => v.id === valueId);
          return av ? av.value.substring(0, 3).toUpperCase() : "";
        })
        .join("-");

      const sku = `${product.sku}-${valueCodes}-${Date.now().toString().slice(-4)}`;

      // Generate name from attribute values
      const name = combination
        .map((valueId) => {
          const av = attributeValues.find((v) => v.id === valueId);
          return av ? av.value : "";
        })
        .join(" / ");

      try {
        await db.productVariant.create({
          data: {
            productId,
            sku,
            name,
            priceModifier: 0,
            quantity: 0,
            attributes: {
              create: combination.map((valueId) => ({
                attributeValueId: valueId,
              })),
            },
          },
        });
        count++;
      } catch (error) {
        // Skip duplicates
        console.log("Skipping duplicate variant");
      }
    }

    revalidatePath(`/vendor/products/${productId}`);
    return { success: true, data: { count } };
  } catch (error) {
    console.error("Error generating variants:", error);
    return { success: false, error: "Failed to generate variants" };
  }
}

// Helper function to generate all combinations
function generateCombinations(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [[]];
  if (arrays.length === 1) return arrays[0].map((item) => [item]);

  const result: string[][] = [];
  const [first, ...rest] = arrays;
  const restCombinations = generateCombinations(rest);

  for (const item of first) {
    for (const combination of restCombinations) {
      result.push([item, ...combination]);
    }
  }

  return result;
}
