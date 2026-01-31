import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import nodemailer from "nodemailer";
import { format } from "date-fns";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    // Get order details
    const order = await db.rentalOrder.findFirst({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        address: true,
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: true,
              },
            },
            variant: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.customer.email) {
      return NextResponse.json(
        { error: "Customer email not available" },
        { status: 400 },
      );
    }

    // Calculate totals
    const subtotal = order.items.reduce(
      (sum, item) => sum + Number(item.totalPrice),
      0,
    );
    const taxAmount = Number(order.taxAmount) || subtotal * 0.18;
    const totalAmount = Number(order.totalAmount) || subtotal + taxAmount;
    const securityDeposit = Number(order.securityDeposit) || 0;
    const deliveryCharge = Number(order.deliveryCharge) || 0;

    const customerName =
      [order.customer.firstName, order.customer.lastName]
        .filter(Boolean)
        .join(" ") || "Customer";

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Generate HTML email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Invoice - ${order.orderNumber}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px 40px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">RentNow</h1>
                            <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Rental Services</p>
                          </td>
                          <td align="right">
                            <p style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">INVOICE</p>
                            <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">${order.orderNumber}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Order Info -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8fafc;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Order Date</p>
                            <p style="margin: 5px 0 0 0; font-size: 16px; color: #1f2937; font-weight: 500;">${format(new Date(order.createdAt), "MMMM dd, yyyy")}</p>
                          </td>
                          <td align="right">
                            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Status</p>
                            <p style="margin: 5px 0 0 0; font-size: 16px; color: #10b981; font-weight: 500;">${order.status}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Customer Details -->
                  <tr>
                    <td style="padding: 30px 40px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="50%" valign="top">
                            <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Bill To</p>
                            <p style="margin: 0; font-size: 16px; color: #1f2937; font-weight: 600;">${customerName}</p>
                            ${order.customer.email ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">${order.customer.email}</p>` : ""}
                            ${order.customer.phone ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">${order.customer.phone}</p>` : ""}
                          </td>
                          <td width="50%" valign="top" align="right">
                            <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Delivery Address</p>
                            ${
                              order.address
                                ? `
                              <p style="margin: 0; font-size: 14px; color: #6b7280;">${order.address.addressLine1}</p>
                              ${order.address.addressLine2 ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">${order.address.addressLine2}</p>` : ""}
                              <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">${order.address.city}, ${order.address.state} - ${order.address.postalCode}</p>
                            `
                                : `<p style="margin: 0; font-size: 14px; color: #6b7280;">Self Pickup</p>`
                            }
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Items Table -->
                  <tr>
                    <td style="padding: 0 40px 30px 40px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                        <tr style="background-color: #6366f1;">
                          <th style="padding: 12px 15px; text-align: left; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Product</th>
                          <th style="padding: 12px 15px; text-align: center; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Rental Period</th>
                          <th style="padding: 12px 15px; text-align: center; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                          <th style="padding: 12px 15px; text-align: right; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
                        </tr>
                        ${order.items
                          .map(
                            (item) => `
                          <tr style="border-bottom: 1px solid #f3f4f6;">
                            <td style="padding: 15px;">
                              <p style="margin: 0; font-size: 14px; color: #1f2937; font-weight: 500;">${item.product.name}</p>
                              ${item.variant ? `<p style="margin: 3px 0 0 0; font-size: 12px; color: #6b7280;">${item.variant.name}</p>` : ""}
                            </td>
                            <td style="padding: 15px; text-align: center;">
                              <p style="margin: 0; font-size: 13px; color: #6b7280;">${format(new Date(item.rentalStartDate), "dd MMM")} - ${format(new Date(item.rentalEndDate), "dd MMM yyyy")}</p>
                            </td>
                            <td style="padding: 15px; text-align: center; font-size: 14px; color: #1f2937;">${item.quantity}</td>
                            <td style="padding: 15px; text-align: right; font-size: 14px; color: #1f2937; font-weight: 500;">₹${Number(item.totalPrice).toLocaleString()}</td>
                          </tr>
                        `,
                          )
                          .join("")}
                      </table>
                    </td>
                  </tr>

                  <!-- Totals -->
                  <tr>
                    <td style="padding: 0 40px 30px 40px;">
                      <table width="280" cellpadding="0" cellspacing="0" align="right" style="background-color: #f8fafc; border-radius: 8px; padding: 20px;">
                        <tr>
                          <td style="padding: 8px 20px; font-size: 14px; color: #6b7280;">Subtotal</td>
                          <td style="padding: 8px 20px; font-size: 14px; color: #1f2937; text-align: right;">₹${subtotal.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 20px; font-size: 14px; color: #6b7280;">Tax (GST 18%)</td>
                          <td style="padding: 8px 20px; font-size: 14px; color: #1f2937; text-align: right;">₹${taxAmount.toLocaleString()}</td>
                        </tr>
                        ${
                          deliveryCharge > 0
                            ? `
                        <tr>
                          <td style="padding: 8px 20px; font-size: 14px; color: #6b7280;">Delivery</td>
                          <td style="padding: 8px 20px; font-size: 14px; color: #1f2937; text-align: right;">₹${deliveryCharge.toLocaleString()}</td>
                        </tr>
                        `
                            : ""
                        }
                        ${
                          securityDeposit > 0
                            ? `
                        <tr>
                          <td style="padding: 8px 20px; font-size: 14px; color: #6b7280;">Security Deposit</td>
                          <td style="padding: 8px 20px; font-size: 14px; color: #1f2937; text-align: right;">₹${securityDeposit.toLocaleString()}</td>
                        </tr>
                        `
                            : ""
                        }
                        <tr>
                          <td colspan="2" style="padding: 0 20px;">
                            <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 10px 0;">
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 20px; font-size: 18px; color: #1f2937; font-weight: bold;">Total</td>
                          <td style="padding: 8px 20px; font-size: 18px; color: #6366f1; font-weight: bold; text-align: right;">₹${totalAmount.toLocaleString()}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8fafc; border-top: 1px solid #e5e7eb;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <p style="margin: 0; font-size: 16px; color: #1f2937; font-weight: 600;">Thank you for your business!</p>
                            <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">If you have any questions, please contact our support team.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Contact Info -->
                  <tr>
                    <td style="padding: 20px 40px; background-color: #1f2937;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <p style="margin: 0; font-size: 14px; color: #9ca3af;">
                              RentNow | support@rentnow.com | +91-9876543210
                            </p>
                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">
                              This is an automatically generated email. Please do not reply directly.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: order.customer.email,
      subject: `Order Invoice - ${order.orderNumber}`,
      html: emailHtml,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: `Invoice sent to ${order.customer.email}`,
    });
  } catch (error: any) {
    console.error("Error sending invoice email:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 },
    );
  }
}
