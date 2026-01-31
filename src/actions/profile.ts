"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

export interface AddressData {
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

// Get user profile
export async function getProfile(): Promise<UserProfile | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) return null;

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      image: user.image,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
}

// Update user profile
export async function updateProfile(data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  image?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    await db.user.update({
      where: { id: session.user.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        image: data.image,
      },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

// Get user addresses
export async function getAddresses(): Promise<AddressData[]> {
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

// Add new address
export async function addAddress(data: {
  label?: string;
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

    // If setting as default, remove default from other addresses
    if (data.isDefault) {
      await db.address.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }

    // If this is the first address, make it default
    const addressCount = await db.address.count({
      where: { userId: session.user.id },
    });

    const address = await db.address.create({
      data: {
        userId: session.user.id,
        label: data.label,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country || "India",
        isDefault: data.isDefault || addressCount === 0,
      },
    });

    revalidatePath("/profile");
    revalidatePath("/checkout/address");
    return { success: true, addressId: address.id };
  } catch (error) {
    console.error("Error adding address:", error);
    return { success: false, error: "Failed to add address" };
  }
}

// Update address
export async function updateAddress(
  addressId: string,
  data: {
    label?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    isDefault?: boolean;
  },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // If setting as default, remove default from other addresses
    if (data.isDefault) {
      await db.address.updateMany({
        where: {
          userId: session.user.id,
          id: { not: addressId },
        },
        data: { isDefault: false },
      });
    }

    await db.address.update({
      where: { id: addressId },
      data,
    });

    revalidatePath("/profile");
    revalidatePath("/checkout/address");
    return { success: true };
  } catch (error) {
    console.error("Error updating address:", error);
    return { success: false, error: "Failed to update address" };
  }
}

// Delete address
export async function deleteAddress(addressId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const address = await db.address.findFirst({
      where: {
        id: addressId,
        userId: session.user.id,
      },
    });

    if (!address) {
      return { success: false, error: "Address not found" };
    }

    await db.address.delete({
      where: { id: addressId },
    });

    // If deleted address was default, set another as default
    if (address.isDefault) {
      const firstAddress = await db.address.findFirst({
        where: { userId: session.user.id },
      });

      if (firstAddress) {
        await db.address.update({
          where: { id: firstAddress.id },
          data: { isDefault: true },
        });
      }
    }

    revalidatePath("/profile");
    revalidatePath("/checkout/address");
    return { success: true };
  } catch (error) {
    console.error("Error deleting address:", error);
    return { success: false, error: "Failed to delete address" };
  }
}

// Set default address
export async function setDefaultAddress(addressId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Remove default from all addresses
    await db.address.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    });

    // Set new default
    await db.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    revalidatePath("/profile");
    revalidatePath("/checkout/address");
    return { success: true };
  } catch (error) {
    console.error("Error setting default address:", error);
    return { success: false, error: "Failed to set default address" };
  }
}

// Change password
export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.password) {
      return { success: false, error: "User not found" };
    }

    const isValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isValid) {
      return { success: false, error: "Current password is incorrect" };
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await db.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
        isPasswordChanged: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error changing password:", error);
    return { success: false, error: "Failed to change password" };
  }
}

// Delete account
export async function deleteAccount() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { isActive: false },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting account:", error);
    return { success: false, error: "Failed to delete account" };
  }
}

// ==================== VENDOR PROFILE FUNCTIONS ====================

export interface VendorProfileData {
  id: string;
  businessName: string;
  businessEmail: string | null;
  businessPhone: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  bankAccountNo: string | null;
  bankIfscCode: string | null;
  bankName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  website: string | null;
  isVerified: boolean;
}

// Get vendor profile
export async function getVendorProfile(): Promise<VendorProfileData | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    const vendorProfile = await db.vendorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!vendorProfile) return null;

    return {
      id: vendorProfile.id,
      businessName: vendorProfile.businessName,
      businessEmail: vendorProfile.businessEmail,
      businessPhone: vendorProfile.businessPhone,
      gstNumber: vendorProfile.gstNumber,
      panNumber: vendorProfile.panNumber,
      bankAccountNo: vendorProfile.bankAccountNo,
      bankIfscCode: vendorProfile.bankIfscCode,
      bankName: vendorProfile.bankName,
      addressLine1: vendorProfile.addressLine1,
      addressLine2: vendorProfile.addressLine2,
      city: vendorProfile.city,
      state: vendorProfile.state,
      postalCode: vendorProfile.postalCode,
      country: vendorProfile.country,
      website: vendorProfile.website,
      isVerified: vendorProfile.isVerified,
    };
  } catch (error) {
    console.error("Error fetching vendor profile:", error);
    return null;
  }
}

// Update vendor profile
export async function updateVendorProfile(data: {
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  gstNumber?: string;
  panNumber?: string;
  bankAccountNo?: string;
  bankIfscCode?: string;
  bankName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  website?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if vendor profile exists
    const existingProfile = await db.vendorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (existingProfile) {
      // Update existing profile
      await db.vendorProfile.update({
        where: { userId: session.user.id },
        data: {
          businessName: data.businessName,
          businessEmail: data.businessEmail,
          businessPhone: data.businessPhone,
          gstNumber: data.gstNumber,
          panNumber: data.panNumber,
          bankAccountNo: data.bankAccountNo,
          bankIfscCode: data.bankIfscCode,
          bankName: data.bankName,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
          website: data.website,
        },
      });
    } else {
      // Create new profile
      await db.vendorProfile.create({
        data: {
          userId: session.user.id,
          businessName: data.businessName || "My Business",
          businessEmail: data.businessEmail,
          businessPhone: data.businessPhone,
          gstNumber: data.gstNumber,
          panNumber: data.panNumber,
          bankAccountNo: data.bankAccountNo,
          bankIfscCode: data.bankIfscCode,
          bankName: data.bankName,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
          website: data.website,
        },
      });
    }

    revalidatePath("/vendor/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating vendor profile:", error);
    return { success: false, error: "Failed to update vendor profile" };
  }
}
