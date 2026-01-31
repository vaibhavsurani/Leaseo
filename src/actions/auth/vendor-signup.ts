"use server";

import { getUserByEmail } from "@/data/user";
import { VendorRegisterSchema } from "@/lib";
import { db } from "@/lib/db";
import { generateVerificationToken } from "@/lib/token";
import * as z from "zod";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/lib/email";
import { UserRole } from "@prisma/client";

export const registerVendor = async (values: z.infer<typeof VendorRegisterSchema>) => {
    const validation = VendorRegisterSchema.safeParse(values);

    if (!validation.success) {
        return { error: "Invalid fields!", success: "" };
    }

    const { email, password, firstName, lastName, businessName, gstNumber } = validation.data;

    const name = `${firstName} ${lastName}`;

    const existingUser = await getUserByEmail(email);

    if (existingUser) {
        return { error: "User already exists!", success: "" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        // Create User with VENDOR role
        const user = await db.user.create({
            data: {
                // name is not in the new schema directly on User? Wait, checking schema...
                // User model has firstName, lastName. It does NOT have 'name'. 
                // Previous schema had 'name'?
                // New schema: firstName, lastName.
                firstName,
                lastName,
                email,
                password: hashedPassword,
                role: UserRole.VENDOR,
                vendorProfile: {
                    create: {
                        businessName, // Mapped from businessName
                        gstNumber,
                        // productCategory removed
                    },
                },
            },
        });

        const verificationToken = await generateVerificationToken(email);

        await sendVerificationEmail(
            verificationToken.email,
            verificationToken.token,
            name
        );

        return { success: "Confirmation email sent!" };
    } catch (error) {
        console.error("Vendor Registration Error:", error);
        return { error: "Something went wrong during registration.", success: "" };
    }
};
