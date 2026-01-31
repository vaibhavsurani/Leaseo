import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createRazorpayOrder } from "@/lib/razorpay";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, orderId, type = "order" } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Generate receipt ID (max 40 chars for Razorpay)
    const timestamp = Date.now().toString().slice(-8);
    const receipt = orderId
      ? `ord_${orderId.slice(0, 20)}_${timestamp}`
      : `chk_${timestamp}`;

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder({
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt,
      notes: {
        userId: session.user.id,
        orderId: orderId || "",
        type,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("Error creating payment order:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment order" },
      { status: 500 },
    );
  }
}
