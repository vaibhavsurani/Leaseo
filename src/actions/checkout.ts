"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  checkProductAvailability,
  createReservation,
  cancelOrderReservations,
} from "@/lib/availability";

export interface CheckoutAddress {
  id: string;
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface CartSummary {
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    rentalStartDate: Date;
    rentalEndDate: Date;
    periodType: string;
    image: string | null;
    securityDeposit: number;
  }>;
  subtotal: number;
  taxAmount: number;
  securityDeposit: number;
  total: number;
  itemCount: number;
}

// Get user addresses for checkout
export async function getCheckoutAddresses(): Promise<CheckoutAddress[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    const addresses = await db.address.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return addresses.map((addr) => ({
      id: addr.id,
      label: addr.label,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
      isDefault: addr.isDefault,
    }));
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return [];
  }
}

// Add new address during checkout
export async function addCheckoutAddress(data: {
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db.address.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }

    const address = await db.address.create({
      data: {
        userId: session.user.id,
        label: data.label,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || null,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country || "India",
        isDefault: data.isDefault || false,
      },
    });

    revalidatePath("/checkout/address");

    return {
      success: true,
      address: {
        id: address.id,
        label: address.label,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        isDefault: address.isDefault,
      },
    };
  } catch (error) {
    console.error("Error adding address:", error);
    return { success: false, error: "Failed to add address" };
  }
}

// Get cart summary for checkout
export async function getCartSummary(): Promise<CartSummary> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        items: [],
        subtotal: 0,
        taxAmount: 0,
        securityDeposit: 0,
        total: 0,
        itemCount: 0,
      };
    }

    const cart = await db.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
            variant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return {
        items: [],
        subtotal: 0,
        taxAmount: 0,
        securityDeposit: 0,
        total: 0,
        itemCount: 0,
      };
    }

    let subtotal = 0;
    let securityDeposit = 0;

    const items = cart.items.map((item) => {
      const basePrice = Number(item.product.basePrice);
      const variantModifier = item.variant
        ? Number(item.variant.priceModifier)
        : 0;
      const unitPrice = basePrice + variantModifier;
      const days = Math.ceil(
        (item.rentalEndDate.getTime() - item.rentalStartDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const totalPrice = unitPrice * item.quantity * (days || 1);

      subtotal += totalPrice;
      securityDeposit += Number(item.product.securityDeposit) * item.quantity;

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSlug: item.product.slug,
        variantName: item.variant?.name || null,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        rentalStartDate: item.rentalStartDate,
        rentalEndDate: item.rentalEndDate,
        periodType: item.periodType,
        image: item.product.images[0]?.url || null,
        securityDeposit: Number(item.product.securityDeposit),
      };
    });

    const taxAmount = Math.round(subtotal * 0.18); // 18% GST
    const total = subtotal + taxAmount + securityDeposit;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items,
      subtotal,
      taxAmount,
      securityDeposit,
      total,
      itemCount,
    };
  } catch (error) {
    console.error("Error fetching cart summary:", error);
    return {
      items: [],
      subtotal: 0,
      taxAmount: 0,
      securityDeposit: 0,
      total: 0,
      itemCount: 0,
    };
  }
}

// Save checkout address selection to session/cache
export async function saveCheckoutSelection(data: {
  addressId: string;
  deliveryMethod: "pickup" | "delivery" | "scheduled";
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify address exists and belongs to user
    const address = await db.address.findFirst({
      where: {
        id: data.addressId,
        userId: session.user.id,
      },
    });

    if (!address) {
      return { success: false, error: "Address not found" };
    }

    // Store in user's cart or a checkout session
    // For now, we'll just validate and return success
    return {
      success: true,
      data: {
        addressId: data.addressId,
        deliveryMethod: data.deliveryMethod,
      },
    };
  } catch (error) {
    console.error("Error saving checkout selection:", error);
    return { success: false, error: "Failed to save selection" };
  }
}

// Process payment and create order
export async function processPayment(data: {
  addressId: string;
  paymentMethod: "card" | "upi" | "wallet" | "netbanking";
  couponCode?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Get cart
    const cart = await db.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return { success: false, error: "Cart is empty" };
    }

    // Check DATE-BASED availability for all items
    for (const item of cart.items) {
      const availability = await checkProductAvailability(
        item.productId,
        item.rentalStartDate,
        item.rentalEndDate,
        item.quantity,
      );

      if (!availability.available) {
        return {
          success: false,
          error: `"${item.product.name}" is not available for the selected dates. ${availability.message || `Only ${availability.availableQuantity} units available.`}`,
        };
      }
    }

    // Verify address
    const address = await db.address.findFirst({
      where: {
        id: data.addressId,
        userId: session.user.id,
      },
    });

    if (!address) {
      return { success: false, error: "Address not found" };
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of cart.items) {
      const basePrice = Number(item.product.basePrice);
      const variantModifier = item.variant
        ? Number(item.variant.priceModifier)
        : 0;
      const unitPrice = basePrice + variantModifier;
      const days = Math.ceil(
        (item.rentalEndDate.getTime() - item.rentalStartDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const totalPrice = unitPrice * item.quantity * (days || 1);
      subtotal += totalPrice;

      orderItems.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        rentalStartDate: item.rentalStartDate,
        rentalEndDate: item.rentalEndDate,
        periodType: item.periodType,
        periodDuration: days || 1,
      });
    }

    const taxAmount = Math.round(subtotal * 0.18); // 18% GST
    const securityDeposit = cart.items.reduce(
      (sum, item) => sum + Number(item.product.securityDeposit) * item.quantity,
      0,
    );
    const totalAmount = subtotal + taxAmount + securityDeposit;

    // Generate order number
    const orderCount = await db.rentalOrder.count();
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(orderCount + 1).padStart(6, "0")}`;

    // Create order
    const order = await db.rentalOrder.create({
      data: {
        orderNumber,
        customerId: session.user.id,
        addressId: data.addressId,
        status: "CONFIRMED",
        subtotal,
        taxAmount,
        discountAmount: 0,
        totalAmount,
        securityDeposit,
        paidAmount: totalAmount,
        confirmedAt: new Date(),
        items: {
          create: orderItems,
        },
      },
      include: {
        address: true,
        items: {
          include: {
            product: {
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
            variant: true,
          },
        },
      },
    });

    // Create payment record
    const paymentCount = await db.payment.count();
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(6, "0")}`;

    await db.payment.create({
      data: {
        paymentNumber,
        orderId: order.id,
        customerId: session.user.id,
        amount: totalAmount,
        paymentType: "FULL_PAYMENT",
        status: "COMPLETED",
        paymentMethod: data.paymentMethod,
        paidAt: new Date(),
      },
    });

    // Create RESERVATIONS for date-based availability (instead of decrementing quantity)
    for (const item of cart.items) {
      await createReservation({
        productId: item.productId,
        variantId: item.variantId || undefined,
        orderId: order.id,
        quantity: item.quantity,
        startDate: item.rentalStartDate,
        endDate: item.rentalEndDate,
      });
    }

    // Clear cart
    await db.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    revalidatePath("/cart");
    revalidatePath("/orders");
    revalidatePath("/checkout/confirmation");
    revalidatePath("/products");

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  } catch (error) {
    console.error("Error processing payment:", error);
    return { success: false, error: "Payment processing failed" };
  }
}

// Get order confirmation details
export async function getOrderConfirmation(orderId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    const order = await db.rentalOrder.findFirst({
      where: {
        id: orderId,
        customerId: session.user.id,
      },
      include: {
        address: true,
        items: {
          include: {
            product: {
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
            variant: true,
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!order) return null;

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase().replace("_", "-"),
      orderDate: order.createdAt,
      address: order.address
        ? {
            label: order.address.label,
            addressLine1: order.address.addressLine1,
            addressLine2: order.address.addressLine2,
            city: order.address.city,
            state: order.address.state,
            postalCode: order.address.postalCode,
            country: order.address.country,
          }
        : null,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.product.name,
        image: item.product.images[0]?.url || null,
        variantName: item.variant?.name || null,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        rentalStartDate: item.rentalStartDate,
        rentalEndDate: item.rentalEndDate,
        periodType: item.periodType,
      })),
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      securityDeposit: Number(order.securityDeposit),
      totalAmount: Number(order.totalAmount),
      payment: order.payments[0]
        ? {
            method: order.payments[0].paymentMethod,
            status: order.payments[0].status.toLowerCase(),
            paidAt: order.payments[0].paidAt,
          }
        : null,
    };
  } catch (error) {
    console.error("Error fetching order confirmation:", error);
    return null;
  }
}

// Get last created order for confirmation page
export async function getLatestOrderConfirmation() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    const order = await db.rentalOrder.findFirst({
      where: {
        customerId: session.user.id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        address: true,
        items: {
          include: {
            product: {
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
            variant: true,
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!order) return null;

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase().replace("_", "-"),
      orderDate: order.createdAt,
      address: order.address
        ? {
            label: order.address.label,
            addressLine1: order.address.addressLine1,
            addressLine2: order.address.addressLine2,
            city: order.address.city,
            state: order.address.state,
            postalCode: order.address.postalCode,
            country: order.address.country,
          }
        : null,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.product.name,
        image: item.product.images[0]?.url || null,
        variantName: item.variant?.name || null,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        rentalStartDate: item.rentalStartDate,
        rentalEndDate: item.rentalEndDate,
        periodType: item.periodType,
      })),
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      securityDeposit: Number(order.securityDeposit),
      totalAmount: Number(order.totalAmount),
      payment: order.payments[0]
        ? {
            method: order.payments[0].paymentMethod,
            status: order.payments[0].status.toLowerCase(),
            paidAt: order.payments[0].paidAt,
          }
        : null,
    };
  } catch (error) {
    console.error("Error fetching latest order:", error);
    return null;
  }
}

// Process payment for quotation and create order
export async function processQuotationPayment(data: {
  quotationId: string;
  paymentMethod: "card" | "upi" | "wallet" | "netbanking";
}): Promise<{
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Get quotation
    const quotation = await db.quotation.findFirst({
      where: {
        id: data.quotationId,
        customerId: session.user.id,
        status: "SENT",
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotation) {
      return { success: false, error: "Quotation not found or invalid" };
    }

    // Check if quotation has expired
    if (new Date() > quotation.validUntil) {
      await db.quotation.update({
        where: { id: quotation.id },
        data: { status: "EXPIRED" },
      });
      return { success: false, error: "Quotation has expired" };
    }

    // Check availability for all items
    for (const item of quotation.items) {
      const availability = await checkProductAvailability(
        item.productId,
        item.rentalStartDate,
        item.rentalEndDate,
        item.quantity,
      );

      if (!availability.available) {
        return {
          success: false,
          error: `${item.product.name} is no longer available for the selected dates`,
        };
      }
    }

    // Generate order number
    const orderCount = await db.rentalOrder.count();
    const orderNumber = `SO${String(orderCount + 1).padStart(5, "0")}`;

    // Create the order
    const order = await db.rentalOrder.create({
      data: {
        orderNumber,
        quotationId: quotation.id,
        customerId: session.user.id,
        addressId: quotation.addressId,
        status: "CONFIRMED",
        subtotal: quotation.subtotal,
        taxAmount: quotation.taxAmount,
        discountAmount: quotation.discountAmount,
        totalAmount: quotation.totalAmount,
        securityDeposit: quotation.securityDeposit,
        paidAmount: quotation.totalAmount,
        notes: quotation.notes,
        confirmedAt: new Date(),
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

    // Create reservations for date-based availability
    for (const item of quotation.items) {
      await createReservation({
        productId: item.productId,
        orderId: order.id,
        startDate: item.rentalStartDate,
        endDate: item.rentalEndDate,
        quantity: item.quantity,
      });
    }

    // Generate payment number
    const paymentCount = await db.payment.count();
    const paymentNumber = `PAY${String(paymentCount + 1).padStart(5, "0")}`;

    // Create payment record
    await db.payment.create({
      data: {
        paymentNumber,
        orderId: order.id,
        customerId: session.user.id,
        amount: quotation.totalAmount,
        paymentType: "FULL_PAYMENT",
        status: "COMPLETED",
        paymentMethod: data.paymentMethod,
        paidAt: new Date(),
      },
    });

    // Update quotation status
    await db.quotation.update({
      where: { id: quotation.id },
      data: { status: "CONFIRMED" },
    });

    revalidatePath("/quotations");
    revalidatePath("/orders");

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  } catch (error) {
    console.error("Error processing quotation payment:", error);
    return { success: false, error: "Payment processing failed" };
  }
}
