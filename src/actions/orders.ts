"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { OrderStatus, RentalPeriodType, QuotationStatus } from "@prisma/client";
import { cancelOrderReservations } from "@/lib/availability";

export interface OrderWithDetails {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  deliveryCharge: number;
  deliveryMethod: string | null;
  totalAmount: number;
  securityDeposit: number;
  paidAmount: number;
  notes: string | null;
  confirmedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  address: {
    id: string;
    label: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productImage: string | null;
    variantId: string | null;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    rentalStartDate: Date;
    rentalEndDate: Date;
    periodType: string;
    periodDuration: number;
  }>;
  pickup: {
    id: string;
    pickupNumber: string;
    status: string;
    scheduledDate: Date | null;
    actualPickupDate: Date | null;
  } | null;
  return: {
    id: string;
    returnNumber: string;
    status: string;
    scheduledDate: Date | null;
    actualReturnDate: Date | null;
  } | null;
  payments: Array<{
    id: string;
    paymentNumber: string;
    amount: number;
    paymentType: string;
    status: string;
    paymentMethod: string | null;
    paidAt: Date | null;
    transactionId: string | null;
  }>;
}

// Get all orders for current user
export async function getOrders(statusFilter?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    const where: any = {
      customerId: session.user.id,
    };

    if (statusFilter && statusFilter !== "all") {
      where.status = statusFilter.toUpperCase() as OrderStatus;
    }

    const orders = await db.rentalOrder.findMany({
      where,
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
      },
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase().replace("_", "-"),
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      securityDeposit: Number(order.securityDeposit),
      paidAmount: Number(order.paidAmount),
      createdAt: order.createdAt,
      confirmedAt: order.confirmedAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images[0]?.url || null,
        variantId: item.variantId,
        variantName: item.variant?.name || null,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        rentalStartDate: item.rentalStartDate,
        rentalEndDate: item.rentalEndDate,
        periodType: item.periodType,
        periodDuration: item.periodDuration,
      })),
      address: order.address
        ? {
            id: order.address.id,
            label: order.address.label,
            addressLine1: order.address.addressLine1,
            addressLine2: order.address.addressLine2,
            city: order.address.city,
            state: order.address.state,
            postalCode: order.address.postalCode,
            country: order.address.country,
          }
        : null,
    }));
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
}

// Get single order by ID
export async function getOrderById(
  orderId: string,
): Promise<OrderWithDetails | null> {
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
        pickup: true,
        return: true,
        payments: true,
      },
    });

    if (!order) return null;

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase().replace("_", "-"),
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      deliveryCharge: Number(order.deliveryCharge),
      deliveryMethod: order.deliveryMethod,
      totalAmount: Number(order.totalAmount),
      securityDeposit: Number(order.securityDeposit),
      paidAmount: Number(order.paidAmount),
      notes: order.notes,
      confirmedAt: order.confirmedAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      createdAt: order.createdAt,
      address: order.address
        ? {
            id: order.address.id,
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
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images[0]?.url || null,
        variantId: item.variantId,
        variantName: item.variant?.name || null,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        rentalStartDate: item.rentalStartDate,
        rentalEndDate: item.rentalEndDate,
        periodType: item.periodType,
        periodDuration: item.periodDuration,
      })),
      pickup: order.pickup
        ? {
            id: order.pickup.id,
            pickupNumber: order.pickup.pickupNumber,
            status: order.pickup.status.toLowerCase().replace("_", "-"),
            scheduledDate: order.pickup.scheduledDate,
            actualPickupDate: order.pickup.actualPickupDate,
          }
        : null,
      return: order.return
        ? {
            id: order.return.id,
            returnNumber: order.return.returnNumber,
            status: order.return.status.toLowerCase().replace("_", "-"),
            scheduledDate: order.return.scheduledDate,
            actualReturnDate: order.return.actualReturnDate,
          }
        : null,
      payments: order.payments.map((payment) => ({
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        amount: Number(payment.amount),
        paymentType: payment.paymentType.toLowerCase().replace("_", "-"),
        status: payment.status.toLowerCase(),
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt,
        transactionId: payment.transactionId,
      })),
    };
  } catch (error) {
    console.error("Error fetching order:", error);
    return null;
  }
}

// Create order from cart
export async function createOrder(data: {
  addressId: string;
  paymentMethod: string;
  notes?: string;
  couponId?: string;
  discountAmount?: number;
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
    const discountAmount = data.discountAmount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Calculate total security deposit
    const securityDeposit = cart.items.reduce(
      (sum, item) => sum + Number(item.product.securityDeposit) * item.quantity,
      0,
    );

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
        discountAmount,
        totalAmount,
        securityDeposit,
        notes: data.notes,
        confirmedAt: new Date(),
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
      },
    });

    // Create pickup record
    const pickupCount = await db.pickup.count();
    await db.pickup.create({
      data: {
        pickupNumber: `PK-${new Date().getFullYear()}-${String(pickupCount + 1).padStart(6, "0")}`,
        orderId: order.id,
        status: "PENDING",
      },
    });

    // Create return record
    const returnCount = await db.return.count();
    await db.return.create({
      data: {
        returnNumber: `RT-${new Date().getFullYear()}-${String(returnCount + 1).padStart(6, "0")}`,
        orderId: order.id,
        status: "PENDING",
      },
    });

    // Update coupon usage if used
    if (data.couponId) {
      await db.coupon.update({
        where: { id: data.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    // Clear cart
    await db.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    revalidatePath("/orders");
    revalidatePath("/cart");

    return { success: true, orderId: order.id, orderNumber: order.orderNumber };
  } catch (error) {
    console.error("Error creating order:", error);
    return { success: false, error: "Failed to create order" };
  }
}

// Cancel order
export async function cancelOrder(orderId: string, reason?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const order = await db.rentalOrder.findFirst({
      where: {
        id: orderId,
        customerId: session.user.id,
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
      return { success: false, error: "Order not found" };
    }

    if (!["DRAFT", "CONFIRMED"].includes(order.status)) {
      return {
        success: false,
        error: "Order cannot be cancelled at this stage",
      };
    }

    // Check if there's a Razorpay payment that needs refund
    const razorpayPayment = order.payments.find((p) => p.transactionId);

    if (razorpayPayment && razorpayPayment.transactionId) {
      // Return info that refund needs to be processed via API
      return {
        success: false,
        requiresRefund: true,
        paymentId: razorpayPayment.transactionId,
        amount: Number(razorpayPayment.amount),
        error:
          "This order has a payment that requires refund. Use the refund API.",
      };
    }

    // No Razorpay payment, just cancel the order
    await db.rentalOrder.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        notes: reason ? `Cancellation reason: ${reason}` : order.notes,
      },
    });

    // Cancel reservations when order is cancelled (frees up dates for other customers)
    await cancelOrderReservations(orderId);

    revalidatePath("/orders");
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("Error cancelling order:", error);
    return { success: false, error: "Failed to cancel order" };
  }
}

// Cancel order with refund (calls the refund API internally)
export async function cancelOrderWithRefund(
  orderId: string,
  reason?: string,
): Promise<{
  success: boolean;
  error?: string;
  refund?: {
    id: string;
    amount: number;
    status: string;
  };
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // This will be called from the client side which will hit the refund API
    // The refund API handles the actual Razorpay refund
    return {
      success: false,
      error: "Use the /api/payment/refund endpoint for refunds",
    };
  } catch (error) {
    console.error("Error cancelling order with refund:", error);
    return { success: false, error: "Failed to cancel order" };
  }
}

// ==================== CUSTOMER QUOTATIONS ====================

export interface CustomerQuotation {
  id: string;
  quotationNumber: string;
  status: QuotationStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  securityDeposit: number;
  notes: string | null;
  validUntil: Date;
  createdAt: Date;
  vendor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    email: string | null;
    phone: string | null;
  };
  address: {
    id: string;
    label: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productImage: string | null;
    variantId: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    rentalStartDate: Date;
    rentalEndDate: Date;
    periodType: string;
    periodDuration: number;
  }>;
}

// Get all quotations sent to customer
export async function getCustomerQuotations(
  statusFilter?: string,
): Promise<CustomerQuotation[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    const where: any = {
      customerId: session.user.id,
      status: { in: ["SENT", "CONFIRMED", "CANCELLED", "EXPIRED"] }, // Don't show DRAFT
    };

    if (statusFilter && statusFilter !== "all") {
      where.status = statusFilter.toUpperCase() as QuotationStatus;
    }

    const quotations = await db.quotation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        address: true,
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
                vendor: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    companyName: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return quotations.map((quotation) => {
      const vendor = quotation.items[0]?.product.vendor || {
        id: "",
        firstName: null,
        lastName: null,
        companyName: null,
        email: null,
        phone: null,
      };

      return {
        id: quotation.id,
        quotationNumber: quotation.quotationNumber,
        status: quotation.status,
        subtotal: Number(quotation.subtotal),
        taxAmount: Number(quotation.taxAmount),
        discountAmount: Number(quotation.discountAmount),
        totalAmount: Number(quotation.totalAmount),
        securityDeposit: Number(quotation.securityDeposit),
        notes: quotation.notes,
        validUntil: quotation.validUntil,
        createdAt: quotation.createdAt,
        vendor,
        address: quotation.address
          ? {
              id: quotation.address.id,
              label: quotation.address.label,
              addressLine1: quotation.address.addressLine1,
              addressLine2: quotation.address.addressLine2,
              city: quotation.address.city,
              state: quotation.address.state,
              postalCode: quotation.address.postalCode,
              country: quotation.address.country,
            }
          : null,
        items: quotation.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          productImage: item.product.images[0]?.url || null,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          rentalStartDate: item.rentalStartDate,
          rentalEndDate: item.rentalEndDate,
          periodType: item.periodType,
          periodDuration: item.periodDuration,
        })),
      };
    });
  } catch (error) {
    console.error("Error fetching customer quotations:", error);
    return [];
  }
}

// Get single quotation by ID for customer
export async function getCustomerQuotationById(
  quotationId: string,
): Promise<CustomerQuotation | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    const quotation = await db.quotation.findFirst({
      where: {
        id: quotationId,
        customerId: session.user.id,
      },
      include: {
        address: true,
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
                vendor: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    companyName: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!quotation) return null;

    const vendor = quotation.items[0]?.product.vendor || {
      id: "",
      firstName: null,
      lastName: null,
      companyName: null,
      email: null,
      phone: null,
    };

    return {
      id: quotation.id,
      quotationNumber: quotation.quotationNumber,
      status: quotation.status,
      subtotal: Number(quotation.subtotal),
      taxAmount: Number(quotation.taxAmount),
      discountAmount: Number(quotation.discountAmount),
      totalAmount: Number(quotation.totalAmount),
      securityDeposit: Number(quotation.securityDeposit),
      notes: quotation.notes,
      validUntil: quotation.validUntil,
      createdAt: quotation.createdAt,
      vendor,
      address: quotation.address
        ? {
            id: quotation.address.id,
            label: quotation.address.label,
            addressLine1: quotation.address.addressLine1,
            addressLine2: quotation.address.addressLine2,
            city: quotation.address.city,
            state: quotation.address.state,
            postalCode: quotation.address.postalCode,
            country: quotation.address.country,
          }
        : null,
      items: quotation.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images[0]?.url || null,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        rentalStartDate: item.rentalStartDate,
        rentalEndDate: item.rentalEndDate,
        periodType: item.periodType,
        periodDuration: item.periodDuration,
      })),
    };
  } catch (error) {
    console.error("Error fetching quotation:", error);
    return null;
  }
}

// Accept quotation (converts to order)
export async function acceptQuotation(quotationId: string): Promise<{
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

    const quotation = await db.quotation.findFirst({
      where: {
        id: quotationId,
        customerId: session.user.id,
      },
      include: {
        items: true,
      },
    });

    if (!quotation) {
      return { success: false, error: "Quotation not found" };
    }

    if (quotation.status !== "SENT") {
      return { success: false, error: "Quotation cannot be accepted" };
    }

    if (new Date() > quotation.validUntil) {
      // Update status to expired
      await db.quotation.update({
        where: { id: quotationId },
        data: { status: "EXPIRED" },
      });
      return { success: false, error: "Quotation has expired" };
    }

    // Generate order number
    const orderCount = await db.rentalOrder.count();
    const orderNumber = `SO${String(orderCount + 1).padStart(5, "0")}`;

    // Create rental order from quotation
    const order = await db.rentalOrder.create({
      data: {
        orderNumber,
        quotationId: quotation.id,
        customerId: quotation.customerId,
        addressId: quotation.addressId,
        status: "CONFIRMED",
        subtotal: quotation.subtotal,
        taxAmount: quotation.taxAmount,
        discountAmount: quotation.discountAmount,
        totalAmount: quotation.totalAmount,
        securityDeposit: quotation.securityDeposit,
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

    // Update quotation status
    await db.quotation.update({
      where: { id: quotationId },
      data: { status: "CONFIRMED" },
    });

    revalidatePath("/quotations");
    revalidatePath("/orders");

    return { success: true, orderId: order.id, orderNumber: order.orderNumber };
  } catch (error) {
    console.error("Error accepting quotation:", error);
    return { success: false, error: "Failed to accept quotation" };
  }
}

// Reject quotation
export async function rejectQuotation(quotationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const quotation = await db.quotation.findFirst({
      where: {
        id: quotationId,
        customerId: session.user.id,
      },
    });

    if (!quotation) {
      return { success: false, error: "Quotation not found" };
    }

    if (quotation.status !== "SENT") {
      return { success: false, error: "Quotation cannot be rejected" };
    }

    await db.quotation.update({
      where: { id: quotationId },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/quotations");

    return { success: true };
  } catch (error) {
    console.error("Error rejecting quotation:", error);
    return { success: false, error: "Failed to reject quotation" };
  }
}
