"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// Helper to check admin session
async function getAdminSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  if (session.user.role !== "ADMIN") {
    throw new Error("Not authorized - Admin access required");
  }
  return session;
}

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ==================== CATEGORIES ====================

export async function getAdminCategories() {
  try {
    await getAdminSession();

    const categories = await db.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return { success: true, data: categories };
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch categories",
    };
  }
}

export async function createCategory(data: {
  name: string;
  description?: string;
}) {
  try {
    await getAdminSession();

    const slug = generateSlug(data.name);

    // Check if slug already exists
    const existing = await db.category.findUnique({
      where: { slug },
    });

    if (existing) {
      return {
        success: false,
        error: "A category with this name already exists",
      };
    }

    const category = await db.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        isActive: true,
      },
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/vendor/products/new");
    return { success: true, data: category };
  } catch (error: any) {
    console.error("Error creating category:", error);
    return {
      success: false,
      error: error.message || "Failed to create category",
    };
  }
}

export async function updateCategory(
  id: string,
  data: {
    name?: string;
    description?: string;
    isActive?: boolean;
  },
) {
  try {
    await getAdminSession();

    const updateData: any = {};

    if (data.name) {
      updateData.name = data.name;
      updateData.slug = generateSlug(data.name);

      // Check if new slug conflicts with another category
      const existing = await db.category.findFirst({
        where: {
          slug: updateData.slug,
          NOT: { id },
        },
      });

      if (existing) {
        return {
          success: false,
          error: "A category with this name already exists",
        };
      }
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    const category = await db.category.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/vendor/products/new");
    return { success: true, data: category };
  } catch (error: any) {
    console.error("Error updating category:", error);
    return {
      success: false,
      error: error.message || "Failed to update category",
    };
  }
}

export async function deleteCategory(id: string) {
  try {
    await getAdminSession();

    // Check if category has products
    const category = await db.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return { success: false, error: "Category not found" };
    }

    if (category._count.products > 0) {
      return {
        success: false,
        error: "Cannot delete category with associated products",
      };
    }

    await db.category.delete({
      where: { id },
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/vendor/products/new");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting category:", error);
    return {
      success: false,
      error: error.message || "Failed to delete category",
    };
  }
}

// ==================== SEED CATEGORIES ====================

export async function seedCategories() {
  try {
    await getAdminSession();

    const defaultCategories = [
      { name: "Electronics", description: "Electronic devices and gadgets" },
      { name: "Furniture", description: "Home and office furniture" },
      { name: "Tools & Equipment", description: "Power tools and equipment" },
      { name: "Vehicles", description: "Cars, bikes, and other vehicles" },
      { name: "Event Supplies", description: "Party and event rental items" },
      { name: "Sports & Recreation", description: "Sports equipment and gear" },
      { name: "Clothing", description: "Rental clothing and costumes" },
      {
        name: "Camera & Photography",
        description: "Cameras and photography equipment",
      },
      {
        name: "Audio & Video",
        description: "Sound systems and video equipment",
      },
      {
        name: "Medical Equipment",
        description: "Medical and healthcare equipment",
      },
    ];

    let created = 0;
    for (const cat of defaultCategories) {
      const slug = generateSlug(cat.name);
      const existing = await db.category.findUnique({ where: { slug } });
      if (!existing) {
        await db.category.create({
          data: {
            name: cat.name,
            slug,
            description: cat.description,
            isActive: true,
          },
        });
        created++;
      }
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/vendor/products/new");
    return { success: true, message: `Created ${created} categories` };
  } catch (error: any) {
    console.error("Error seeding categories:", error);
    return {
      success: false,
      error: error.message || "Failed to seed categories",
    };
  }
}

// ==================== DASHBOARD STATS ====================

export async function getAdminStats() {
  try {
    await getAdminSession();

    const [categoriesCount, productsCount, vendorsCount, ordersCount] =
      await Promise.all([
        db.category.count(),
        db.product.count(),
        db.user.count({ where: { role: "VENDOR" } }),
        db.rentalOrder.count(),
      ]);

    return {
      success: true,
      data: {
        categories: categoriesCount,
        products: productsCount,
        vendors: vendorsCount,
        orders: ordersCount,
      },
    };
  } catch (error: any) {
    console.error("Error fetching admin stats:", error);
    return { success: false, error: error.message || "Failed to fetch stats" };
  }
}
