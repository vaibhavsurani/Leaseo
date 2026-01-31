"use server";

import { db } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import {
  checkProductAvailability,
  getAvailableDates,
} from "@/lib/availability";

export interface ProductWithDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  basePrice: number;
  securityDeposit: number;
  quantity: number;
  isRentable: boolean;
  isPublished: boolean;
  minRentalPeriod: number;
  maxRentalPeriod: number | null;
  images: Array<{
    id: string;
    url: string;
    alt: string | null;
    isPrimary: boolean;
  }>;
  category: { id: string; name: string; slug: string } | null;
  variants: Array<{
    id: string;
    name: string | null;
    sku: string;
    priceModifier: number;
    quantity: number;
    isActive: boolean;
    attributes: Array<{
      id: string;
      attributeName: string;
      attributeId: string;
      valueId: string;
      value: string;
    }>;
  }>;
  rentalPricing: Array<{
    id: string;
    periodType: string;
    duration: number;
    price: number;
  }>;
  vendor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
  };
}

// Get all products with filters
export async function getProducts(filters?: {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
}) {
  try {
    const where: any = {
      isPublished: true,
      isRentable: true,
    };

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.basePrice = {};
      if (filters.minPrice !== undefined) {
        where.basePrice.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.basePrice.lte = filters.maxPrice;
      }
    }

    let orderBy: any = { createdAt: "desc" };
    if (filters?.sortBy === "price-asc") {
      orderBy = { basePrice: "asc" };
    } else if (filters?.sortBy === "price-desc") {
      orderBy = { basePrice: "desc" };
    } else if (filters?.sortBy === "name") {
      orderBy = { name: "asc" };
    }

    const products = await db.product.findMany({
      where,
      orderBy,
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
        category: true,
        variants: {
          where: { isActive: true },
        },
      },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      basePrice: Number(p.basePrice),
      securityDeposit: Number(p.securityDeposit),
      quantity: p.quantity,
      isRentable: p.isRentable,
      images: p.images.map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        isPrimary: img.isPrimary,
      })),
      category: p.category
        ? { id: p.category.id, name: p.category.name, slug: p.category.slug }
        : null,
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

// Get single product by slug
export async function getProductBySlug(
  slug: string,
): Promise<ProductWithDetails | null> {
  try {
    const product = await db.product.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
        category: true,
        variants: {
          where: { isActive: true },
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
        },
        rentalPricing: {
          where: { isActive: true },
        },
        vendor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
    });

    if (!product) return null;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      basePrice: Number(product.basePrice),
      securityDeposit: Number(product.securityDeposit),
      quantity: product.quantity,
      isRentable: product.isRentable,
      isPublished: product.isPublished,
      minRentalPeriod: product.minRentalPeriod,
      maxRentalPeriod: product.maxRentalPeriod,
      images: product.images.map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        isPrimary: img.isPrimary,
      })),
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
          }
        : null,
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        priceModifier: Number(v.priceModifier),
        quantity: v.quantity,
        isActive: v.isActive,
        attributes: v.attributes.map((attr) => ({
          id: attr.id,
          attributeName: attr.attributeValue.attribute.name,
          attributeId: attr.attributeValue.attribute.id,
          valueId: attr.attributeValue.id,
          value: attr.attributeValue.value,
        })),
      })),
      rentalPricing: product.rentalPricing.map((rp) => ({
        id: rp.id,
        periodType: rp.periodType,
        duration: rp.duration,
        price: Number(rp.price),
      })),
      vendor: product.vendor,
    };
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

// Get all categories
export async function getCategories() {
  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      productCount: c._count.products,
    }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

// Check product availability for specific dates
export async function checkProductAvailabilityAction(
  productId: string,
  startDate: Date,
  endDate: Date,
  quantity: number = 1,
) {
  return await checkProductAvailability(
    productId,
    startDate,
    endDate,
    quantity,
  );
}

// Get available dates for a product in a month (for calendar display)
export async function getProductAvailableDatesAction(
  productId: string,
  year: number,
  month: number,
) {
  return await getAvailableDates(productId, year, month);
}
