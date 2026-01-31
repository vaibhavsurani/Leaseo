import { db } from "@/lib/db";

/**
 * Check if a product is available for the given dates and quantity
 * Uses the Reservation model to track date-based availability
 */
export async function checkProductAvailability(
  productId: string,
  startDate: Date,
  endDate: Date,
  requestedQuantity: number,
  excludeOrderId?: string, // Exclude a specific order (for order modifications)
): Promise<{
  available: boolean;
  availableQuantity: number;
  totalQuantity: number;
  reservedQuantity: number;
  message?: string;
}> {
  try {
    // 1. Get product's total quantity
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { quantity: true, name: true },
    });

    if (!product) {
      return {
        available: false,
        availableQuantity: 0,
        totalQuantity: 0,
        reservedQuantity: 0,
        message: "Product not found",
      };
    }

    // 2. Find all active reservations that OVERLAP with the requested period
    // Overlap condition: existing.start <= requested.end AND existing.end >= requested.start
    const overlappingReservations = await db.reservation.findMany({
      where: {
        productId,
        isActive: true,
        // Exclude the specified order if provided
        ...(excludeOrderId ? { orderId: { not: excludeOrderId } } : {}),
        // Date overlap check
        AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
      },
    });

    // 3. Calculate total reserved quantity for overlapping period
    const reservedQuantity = overlappingReservations.reduce(
      (sum, reservation) => sum + reservation.quantity,
      0,
    );

    // 4. Calculate available quantity
    const availableQuantity = product.quantity - reservedQuantity;

    // 5. Check if requested quantity is available
    const available = availableQuantity >= requestedQuantity;

    return {
      available,
      availableQuantity: Math.max(0, availableQuantity),
      totalQuantity: product.quantity,
      reservedQuantity,
      message: available
        ? undefined
        : `Only ${availableQuantity} available for the selected dates`,
    };
  } catch (error) {
    console.error("Error checking availability:", error);
    return {
      available: false,
      availableQuantity: 0,
      totalQuantity: 0,
      reservedQuantity: 0,
      message: "Error checking availability",
    };
  }
}

/**
 * Create a reservation for a product
 */
export async function createReservation(data: {
  productId: string;
  variantId?: string;
  orderId?: string;
  quotationId?: string;
  quantity: number;
  startDate: Date;
  endDate: Date;
}) {
  try {
    const reservation = await db.reservation.create({
      data: {
        productId: data.productId,
        variantId: data.variantId || null,
        orderId: data.orderId || null,
        quotationId: data.quotationId || null,
        quantity: data.quantity,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: true,
      },
    });

    return { success: true, reservation };
  } catch (error) {
    console.error("Error creating reservation:", error);
    return { success: false, error: "Failed to create reservation" };
  }
}

/**
 * Cancel/deactivate reservations for an order
 */
export async function cancelOrderReservations(orderId: string) {
  try {
    await db.reservation.updateMany({
      where: { orderId },
      data: { isActive: false },
    });

    return { success: true };
  } catch (error) {
    console.error("Error cancelling reservations:", error);
    return { success: false, error: "Failed to cancel reservations" };
  }
}

/**
 * Get all reservations for a product within a date range
 * Useful for showing availability calendar
 */
export async function getProductReservations(
  productId: string,
  startDate: Date,
  endDate: Date,
) {
  try {
    const reservations = await db.reservation.findMany({
      where: {
        productId,
        isActive: true,
        AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
          },
        },
      },
      orderBy: { startDate: "asc" },
    });

    return reservations;
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return [];
  }
}

/**
 * Get available dates for a product in a given month
 * Returns dates where at least 1 unit is available
 */
export async function getAvailableDates(
  productId: string,
  year: number,
  month: number, // 0-indexed (0 = January)
): Promise<{ date: Date; availableQuantity: number }[]> {
  try {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { quantity: true },
    });

    if (!product) return [];

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);

    // Get all reservations for this month
    const reservations = await db.reservation.findMany({
      where: {
        productId,
        isActive: true,
        AND: [
          { startDate: { lte: endOfMonth } },
          { endDate: { gte: startOfMonth } },
        ],
      },
    });

    // Build availability for each day
    const availableDates: { date: Date; availableQuantity: number }[] = [];
    const daysInMonth = endOfMonth.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);

      // Count reserved quantity for this specific day
      let reservedForDay = 0;
      for (const reservation of reservations) {
        if (
          reservation.startDate <= currentDate &&
          reservation.endDate >= currentDate
        ) {
          reservedForDay += reservation.quantity;
        }
      }

      const availableQuantity = product.quantity - reservedForDay;
      availableDates.push({
        date: currentDate,
        availableQuantity: Math.max(0, availableQuantity),
      });
    }

    return availableDates;
  } catch (error) {
    console.error("Error getting available dates:", error);
    return [];
  }
}
