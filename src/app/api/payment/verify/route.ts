import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { verifyPaymentSignature, getPaymentDetails } from "@/lib/razorpay";
import { revalidatePath } from "next/cache";
import {
  checkProductAvailability,
  createReservation,
} from "@/lib/availability";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      // Support both camelCase (from frontend) and snake_case (from Razorpay)
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      addressId,
      deliveryMethod,
      orderId, // If paying for existing order
    } = body;

    // Use whichever format was provided
    const orderIdValue = razorpayOrderId || razorpay_order_id;
    const paymentIdValue = razorpayPaymentId || razorpay_payment_id;
    const signatureValue = razorpaySignature || razorpay_signature;

    if (!orderIdValue || !paymentIdValue || !signatureValue) {
      return NextResponse.json(
        { error: "Missing payment details" },
        { status: 400 },
      );
    }

    // Calculate delivery charge based on method
    const deliveryCharge =
      deliveryMethod === "delivery"
        ? 200
        : deliveryMethod === "scheduled"
          ? 150
          : 0;

    // Verify payment signature
    const isValid = verifyPaymentSignature({
      razorpay_order_id: orderIdValue,
      razorpay_payment_id: paymentIdValue,
      razorpay_signature: signatureValue,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 },
      );
    }

    // Get payment details from Razorpay
    const paymentDetails = await getPaymentDetails(paymentIdValue);
    const amountPaid = Number(paymentDetails.amount) / 100; // Convert from paise

    // If orderId is provided, update existing order
    if (orderId) {
      const existingOrder = await db.rentalOrder.findFirst({
        where: {
          id: orderId,
          customerId: session.user.id,
        },
      });

      if (!existingOrder) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Create payment record
      const paymentCount = await db.payment.count();
      const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(6, "0")}`;

      await db.payment.create({
        data: {
          paymentNumber,
          orderId: existingOrder.id,
          customerId: session.user.id,
          amount: amountPaid,
          paymentType: "FULL_PAYMENT",
          status: "COMPLETED",
          paymentMethod: paymentDetails.method || "razorpay",
          transactionId: paymentIdValue,
          gatewayResponse: paymentDetails as any,
          paidAt: new Date(),
        },
      });

      // Update order status
      await db.rentalOrder.update({
        where: { id: existingOrder.id },
        data: {
          status: "CONFIRMED",
          paidAmount: amountPaid,
          confirmedAt: new Date(),
        },
      });

      revalidatePath("/orders");
      revalidatePath(`/orders/${existingOrder.id}`);

      return NextResponse.json({
        success: true,
        orderId: existingOrder.id,
        orderNumber: existingOrder.orderNumber,
      });
    }

    // Create new order from cart
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
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Check availability for all items
    for (const item of cart.items) {
      const availability = await checkProductAvailability(
        item.productId,
        item.rentalStartDate,
        item.rentalEndDate,
        item.quantity,
      );

      if (!availability.available) {
        return NextResponse.json(
          {
            error: `"${item.product.name}" is not available for the selected dates`,
          },
          { status: 400 },
        );
      }
    }

    // Verify address
    const address = await db.address.findFirst({
      where: {
        id: addressId,
        userId: session.user.id,
      },
    });

    if (!address) {
      return NextResponse.json({ error: "Address not found" }, { status: 400 });
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

    const taxAmount = Math.round(subtotal * 0.18);
    const securityDeposit = cart.items.reduce(
      (sum, item) => sum + Number(item.product.securityDeposit) * item.quantity,
      0,
    );
    const totalAmount = subtotal + taxAmount + securityDeposit + deliveryCharge;

    // Generate order number
    const orderCount = await db.rentalOrder.count();
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(orderCount + 1).padStart(6, "0")}`;

    // Create order
    const order = await db.rentalOrder.create({
      data: {
        orderNumber,
        customerId: session.user.id,
        addressId,
        status: "CONFIRMED",
        subtotal,
        taxAmount,
        discountAmount: 0,
        deliveryCharge,
        deliveryMethod: deliveryMethod || "pickup",
        totalAmount,
        securityDeposit,
        paidAmount: amountPaid,
        confirmedAt: new Date(),
        items: {
          create: orderItems,
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
        amount: amountPaid,
        paymentType: "FULL_PAYMENT",
        status: "COMPLETED",
        paymentMethod: paymentDetails.method || "razorpay",
        transactionId: paymentIdValue,
        gatewayResponse: paymentDetails as any,
        paidAt: new Date(),
      },
    });

    // Create reservations
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

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: error.message || "Payment verification failed" },
      { status: 500 },
    );
  }
}
