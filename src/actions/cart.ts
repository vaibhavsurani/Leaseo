"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { RentalPeriodType } from "@prisma/client";
import { checkProductAvailability } from "@/lib/availability";

export interface CartItemWithProduct {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rentalStartDate: Date;
  rentalEndDate: Date;
  periodType: string;
  image: string | null;
  securityDeposit: number;
}

// Get user's cart
export async function getCart() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { items: [], total: 0, itemCount: 0 };
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

    if (!cart) {
      return { items: [], total: 0, itemCount: 0 };
    }

    const items: CartItemWithProduct[] = cart.items.map((item) => {
      const basePrice = Number(item.product.basePrice);
      const variantModifier = item.variant
        ? Number(item.variant.priceModifier)
        : 0;
      const unitPrice = basePrice + variantModifier;

      // Calculate days between dates
      const days = Math.ceil(
        (item.rentalEndDate.getTime() - item.rentalStartDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const totalPrice = unitPrice * item.quantity * (days || 1);

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSlug: item.product.slug,
        variantId: item.variantId,
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

    const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return { items, total, itemCount };
  } catch (error) {
    console.error("Error fetching cart:", error);
    return { items: [], total: 0, itemCount: 0 };
  }
}

// Add item to cart
export async function addToCart(data: {
  productId: string;
  variantId?: string;
  quantity: number;
  rentalStartDate: Date;
  rentalEndDate: Date;
  periodType: RentalPeriodType;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Check DATE-BASED availability before adding to cart
    const availability = await checkProductAvailability(
      data.productId,
      data.rentalStartDate,
      data.rentalEndDate,
      data.quantity,
    );

    if (!availability.available) {
      return {
        success: false,
        error:
          availability.message ||
          `Only ${availability.availableQuantity} units available for the selected dates`,
      };
    }

    // Get or create cart
    let cart = await db.cart.findUnique({
      where: { userId: session.user.id },
    });

    if (!cart) {
      cart = await db.cart.create({
        data: { userId: session.user.id },
      });
    }

    // Check if item already exists in cart with same dates
    const existingItem = await db.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: data.productId,
        variantId: data.variantId || null,
        rentalStartDate: data.rentalStartDate,
        rentalEndDate: data.rentalEndDate,
      },
    });

    if (existingItem) {
      // Check availability for combined quantity
      const newQuantity = existingItem.quantity + data.quantity;
      const combinedAvailability = await checkProductAvailability(
        data.productId,
        data.rentalStartDate,
        data.rentalEndDate,
        newQuantity,
      );

      if (!combinedAvailability.available) {
        return {
          success: false,
          error: `Cannot add more. Only ${combinedAvailability.availableQuantity} units available for the selected dates`,
        };
      }

      // Update quantity
      await db.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
        },
      });
    } else {
      // Create new item
      await db.cartItem.create({
        data: {
          cartId: cart.id,
          productId: data.productId,
          variantId: data.variantId || null,
          quantity: data.quantity,
          rentalStartDate: data.rentalStartDate,
          rentalEndDate: data.rentalEndDate,
          periodType: data.periodType,
        },
      });
    }

    revalidatePath("/cart");
    return { success: true };
  } catch (error) {
    console.error("Error adding to cart:", error);
    return { success: false, error: "Failed to add item to cart" };
  }
}

// Update cart item quantity
export async function updateCartItem(itemId: string, quantity: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    if (quantity < 1) {
      return { success: false, error: "Quantity must be at least 1" };
    }

    await db.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    revalidatePath("/cart");
    return { success: true };
  } catch (error) {
    console.error("Error updating cart item:", error);
    return { success: false, error: "Failed to update item" };
  }
}

// Remove item from cart
export async function removeFromCart(itemId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    await db.cartItem.delete({
      where: { id: itemId },
    });

    revalidatePath("/cart");
    return { success: true };
  } catch (error) {
    console.error("Error removing from cart:", error);
    return { success: false, error: "Failed to remove item" };
  }
}

// Clear cart
export async function clearCart() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const cart = await db.cart.findUnique({
      where: { userId: session.user.id },
    });

    if (cart) {
      await db.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    revalidatePath("/cart");
    return { success: true };
  } catch (error) {
    console.error("Error clearing cart:", error);
    return { success: false, error: "Failed to clear cart" };
  }
}

// Validate coupon
export async function validateCoupon(code: string, subtotal: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const coupon = await db.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return { success: false, error: "Invalid coupon code" };
    }

    const now = new Date();
    if (!coupon.isActive || now < coupon.validFrom || now > coupon.validUntil) {
      return { success: false, error: "Coupon is expired or inactive" };
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return { success: false, error: "Coupon usage limit reached" };
    }

    if (coupon.minOrderValue && subtotal < Number(coupon.minOrderValue)) {
      return {
        success: false,
        error: `Minimum order value is ₹${Number(coupon.minOrderValue)}`,
      };
    }

    let discount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discount = (subtotal * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
        discount = Number(coupon.maxDiscount);
      }
    } else {
      discount = Number(coupon.discountValue);
    }

    return {
      success: true,
      discount: Math.round(discount),
      couponId: coupon.id,
      code: coupon.code,
    };
  } catch (error) {
    console.error("Error validating coupon:", error);
    return { success: false, error: "Failed to validate coupon" };
  }
}

// Get cart item count
export async function getCartItemCount() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return 0;
    }

    const cart = await db.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: true,
      },
    });

    if (!cart) return 0;

    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  } catch (error) {
    console.error("Error getting cart count:", error);
    return 0;
  }
}
