"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// Add Wishlist model to schema first if not exists
// For now, we'll create wishlist functionality

export interface WishlistItemWithProduct {
  id: string;
  productId: string;
  name: string;
  slug: string;
  basePrice: number;
  image: string | null;
  rating: number;
  reviews: number;
  inStock: boolean;
  addedAt: Date;
}

// Get user's wishlist
export async function getWishlist() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    const wishlistItems = await db.wishlist.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return wishlistItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      slug: item.product.slug,
      basePrice: Number(item.product.basePrice),
      image: item.product.images[0]?.url || null,
      rating: 4.5, // TODO: Calculate from reviews when implemented
      reviews: 0,
      inStock: item.product.quantity > 0,
      addedAt: item.createdAt,
    }));
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return [];
  }
}

// Add to wishlist
export async function addToWishlist(productId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if already in wishlist
    const existing = await db.wishlist.findFirst({
      where: {
        userId: session.user.id,
        productId,
      },
    });

    if (existing) {
      return { success: false, error: "Item already in wishlist" };
    }

    await db.wishlist.create({
      data: {
        userId: session.user.id,
        productId,
      },
    });

    revalidatePath("/wishlist");
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    return { success: false, error: "Failed to add to wishlist" };
  }
}

// Remove from wishlist
export async function removeFromWishlist(wishlistItemId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    await db.wishlist.delete({
      where: { id: wishlistItemId },
    });

    revalidatePath("/wishlist");
    return { success: true };
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    return { success: false, error: "Failed to remove from wishlist" };
  }
}

// Check if product is in wishlist
export async function isInWishlist(productId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return false;
    }

    const item = await db.wishlist.findFirst({
      where: {
        userId: session.user.id,
        productId,
      },
    });

    return !!item;
  } catch (error) {
    console.error("Error checking wishlist:", error);
    return false;
  }
}

// Get wishlist count
export async function getWishlistCount() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return 0;
    }

    const count = await db.wishlist.count({
      where: { userId: session.user.id },
    });

    return count;
  } catch (error) {
    console.error("Error getting wishlist count:", error);
    return 0;
  }
}
