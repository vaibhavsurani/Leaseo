"use server";

import { getAvailableDates as getAvailableDatesLib } from "@/lib/availability";

export async function getProductAvailability(
  productId: string,
  year: number,
  month: number,
) {
  try {
    const availability = await getAvailableDatesLib(productId, year, month);
    // Convert Date objects to ISO strings for serialization
    return availability.map((item) => ({
      date: item.date.toISOString(),
      availableQuantity: item.availableQuantity,
    }));
  } catch (error) {
    console.error("Error getting product availability:", error);
    return [];
  }
}
