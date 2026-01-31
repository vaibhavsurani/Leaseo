"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Calendar,
  MapPin,
  Package,
  FileText,
  Download,
  ChevronRight,
  Loader2,
  Printer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getOrderConfirmation,
  getLatestOrderConfirmation,
} from "@/actions/checkout";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface OrderConfirmation {
  orderId: string;
  orderNumber: string;
  status: string;
  orderDate: Date;
  address: {
    label: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  items: Array<{
    id: string;
    name: string;
    image: string | null;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    rentalStartDate: Date;
    rentalEndDate: Date;
    periodType: string;
  }>;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  securityDeposit: number;
  totalAmount: number;
  payment: {
    method: string | null;
    status: string;
    paidAt: Date | null;
  } | null;
}

export default function CheckoutConfirmationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState<OrderConfirmation | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setIsLoading(true);

        // Try to get order ID from sessionStorage
        const storedOrderId = sessionStorage.getItem("lastOrderId");

        let orderData;
        if (storedOrderId) {
          orderData = await getOrderConfirmation(storedOrderId);
          sessionStorage.removeItem("lastOrderId");
        } else {
          // Fall back to latest order
          orderData = await getLatestOrderConfirmation();
        }

        if (orderData) {
          setOrder(orderData);
        } else {
          toast.error("Order not found");
          router.push("/orders");
        }
      } catch (error) {
        console.error("Error fetching order:", error);
        toast.error("Failed to load order confirmation");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [router]);

  const handleDownloadInvoice = () => {
    if (!order) return;

    try {
      // Create new PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Company Header
      doc.setFillColor(79, 70, 229); // Indigo color
      doc.rect(0, 0, pageWidth, 40, "F");

      // Company Name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("RentEase", 20, 22);

      // Invoice Title
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("TAX INVOICE", 20, 32);

      // Invoice Number on the right
      doc.setFontSize(10);
      doc.text(`Invoice #: ${order.orderNumber}`, pageWidth - 20, 22, {
        align: "right",
      });
      doc.text(
        `Date: ${format(new Date(order.orderDate), "dd MMM yyyy")}`,
        pageWidth - 20,
        30,
        { align: "right" },
      );

      // Reset text color
      doc.setTextColor(0, 0, 0);

      let yPos = 55;

      // Order Info Section
      doc.setFillColor(248, 250, 252);
      doc.rect(15, yPos - 5, pageWidth - 30, 25, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Order Details", 20, yPos + 3);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Order ID: ${order.orderNumber}`, 20, yPos + 12);
      doc.text(
        `Order Date: ${format(new Date(order.orderDate), "dd MMM yyyy, hh:mm a")}`,
        80,
        yPos + 12,
      );
      doc.text(
        `Status: ${order.status.replace("-", " ").toUpperCase()}`,
        150,
        yPos + 12,
      );

      yPos += 35;

      // Billing Address
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Bill To:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      if (order.address) {
        yPos += 6;
        doc.text(order.address.label || "Customer", 20, yPos);
        yPos += 5;
        doc.text(order.address.addressLine1, 20, yPos);
        if (order.address.addressLine2) {
          yPos += 5;
          doc.text(order.address.addressLine2, 20, yPos);
        }
        yPos += 5;
        doc.text(
          `${order.address.city}, ${order.address.state} - ${order.address.postalCode}`,
          20,
          yPos,
        );
        yPos += 5;
        doc.text(order.address.country, 20, yPos);
      } else {
        yPos += 6;
        doc.text("Self Pickup", 20, yPos);
      }

      yPos += 15;

      // Items Table
      const tableData = order.items.map((item, index) => [
        (index + 1).toString(),
        item.name + (item.variantName ? ` (${item.variantName})` : ""),
        `${format(new Date(item.rentalStartDate), "dd/MM/yy")} - ${format(new Date(item.rentalEndDate), "dd/MM/yy")}`,
        item.periodType,
        item.quantity.toString(),
        `Rs. ${item.unitPrice.toLocaleString()}`,
        `Rs. ${item.totalPrice.toLocaleString()}`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [
          [
            "#",
            "Item Description",
            "Rental Period",
            "Type",
            "Qty",
            "Unit Price",
            "Total",
          ],
        ],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: "bold",
          halign: "center",
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 50 },
          2: { cellWidth: 35, halign: "center" },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 15, halign: "center" },
          5: { cellWidth: 25, halign: "right" },
          6: { cellWidth: 25, halign: "right" },
        },
        margin: { left: 15, right: 15 },
      });

      // Get the Y position after the table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Price Summary Section
      const summaryStartX = pageWidth - 85;
      const summaryWidth = 70;

      doc.setFillColor(248, 250, 252);
      doc.rect(summaryStartX - 5, yPos - 3, summaryWidth + 10, 65, "F");

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      // Subtotal
      doc.text("Subtotal:", summaryStartX, yPos + 5);
      doc.text(
        `Rs. ${order.subtotal.toLocaleString()}`,
        summaryStartX + summaryWidth,
        yPos + 5,
        {
          align: "right",
        },
      );

      // Tax
      doc.text("Tax (GST 18%):", summaryStartX, yPos + 13);
      doc.text(
        `Rs. ${order.taxAmount.toLocaleString()}`,
        summaryStartX + summaryWidth,
        yPos + 13,
        {
          align: "right",
        },
      );

      // Discount (if any)
      if (order.discountAmount > 0) {
        doc.setTextColor(34, 197, 94);
        doc.text("Discount:", summaryStartX, yPos + 21);
        doc.text(
          `-Rs. ${order.discountAmount.toLocaleString()}`,
          summaryStartX + summaryWidth,
          yPos + 21,
          { align: "right" },
        );
        doc.setTextColor(0, 0, 0);
      }

      // Security Deposit
      const depositY = order.discountAmount > 0 ? yPos + 29 : yPos + 21;
      doc.text("Security Deposit:", summaryStartX, depositY);
      doc.text(
        `Rs. ${order.securityDeposit.toLocaleString()}`,
        summaryStartX + summaryWidth,
        depositY,
        { align: "right" },
      );

      // Total
      const totalY = depositY + 12;
      doc.setDrawColor(79, 70, 229);
      doc.line(
        summaryStartX - 5,
        totalY - 5,
        summaryStartX + summaryWidth + 5,
        totalY - 5,
      );
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Total Amount:", summaryStartX, totalY + 3);
      doc.setTextColor(79, 70, 229);
      doc.text(
        `Rs. ${order.totalAmount.toLocaleString()}`,
        summaryStartX + summaryWidth,
        totalY + 3,
        {
          align: "right",
        },
      );

      // Reset color
      doc.setTextColor(0, 0, 0);

      // Payment Info
      const paymentY = totalY + 20;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Payment Information", 20, paymentY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        `Payment Method: ${order.payment?.method?.replace("_", " ").toUpperCase() || "N/A"}`,
        20,
        paymentY + 8,
      );
      doc.text(
        `Payment Status: ${order.payment?.status?.toUpperCase() || "COMPLETED"}`,
        20,
        paymentY + 15,
      );
      if (order.payment?.paidAt) {
        doc.text(
          `Paid On: ${format(new Date(order.payment.paidAt), "dd MMM yyyy, hh:mm a")}`,
          20,
          paymentY + 22,
        );
      }

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 30;
      doc.setDrawColor(200, 200, 200);
      doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text("Terms & Conditions:", 20, footerY);
      doc.text(
        "1. Security deposit will be refunded after successful return of items in good condition.",
        20,
        footerY + 6,
      );
      doc.text(
        "2. Late returns may incur additional charges as per rental agreement.",
        20,
        footerY + 11,
      );
      doc.text(
        "3. This is a computer-generated invoice and does not require a signature.",
        20,
        footerY + 16,
      );

      // Company contact in footer
      doc.setFontSize(8);
      doc.text(
        "RentEase | support@rentease.com | +91-9876543210",
        pageWidth / 2,
        footerY + 24,
        {
          align: "center",
        },
      );

      // Save PDF
      doc.save(`Invoice_${order.orderNumber}.pdf`);
      toast.success("Invoice downloaded successfully!");
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice");
    }
  };

  const handleTrackOrder = () => {
    if (order) {
      router.push(`/orders/${order.orderId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading order confirmation...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">
              We couldn&apos;t find your order details.
            </p>
            <Button onClick={() => router.push("/orders")}>
              View My Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get first item's rental dates for display
  const firstItem = order.items[0];
  const rentalStartDate = firstItem
    ? new Date(firstItem.rentalStartDate)
    : new Date();
  const rentalEndDate = firstItem
    ? new Date(firstItem.rentalEndDate)
    : new Date();

  return (
    <div className="min-h-screen bg-background">
      {/* Success Header */}
      <div className="bg-linear-to-r from-green-50 to-emerald-50 border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative w-20 h-20">
              <CheckCircle className="h-20 w-20 text-green-500 animate-bounce" />
            </div>
            <h1 className="text-3xl font-bold text-green-900">
              Order Confirmed!
            </h1>
            <p className="text-green-700 max-w-md">
              Thank you for your order. Your rental order has been confirmed and
              will be delivered/picked up as scheduled.
            </p>
            <div className="bg-white px-6 py-3 rounded-lg border border-green-200">
              <p className="text-sm font-semibold text-green-900">
                Order ID:{" "}
                <span className="font-bold text-lg">{order.orderNumber}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Rental Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Date</p>
                    <p className="font-semibold">
                      {format(new Date(order.orderDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Rental Start
                    </p>
                    <p className="font-semibold">
                      {format(rentalStartDate, "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rental End</p>
                    <p className="font-semibold">
                      {format(rentalEndDate, "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                      {order.status.replace("-", " ")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items & Details Tabs */}
            <Tabs defaultValue="items" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="items">Order Items</TabsTrigger>
                <TabsTrigger value="delivery">Delivery</TabsTrigger>
                <TabsTrigger value="payment">Payment</TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex gap-4 pb-4 border-b last:border-0 last:pb-0"
                        >
                          <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden shrink-0">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-8 w-8 text-muted-foreground opacity-50" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{item.name}</h4>
                            {item.variantName && (
                              <p className="text-sm text-muted-foreground">
                                {item.variantName}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              Qty: {item.quantity} × ₹
                              {item.unitPrice.toLocaleString()}/
                              {item.periodType.toLowerCase()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(item.rentalStartDate), "MMM dd")}{" "}
                              -{" "}
                              {format(
                                new Date(item.rentalEndDate),
                                "MMM dd, yyyy",
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              ₹{item.totalPrice.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="delivery" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {order.address ? (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <h4 className="font-semibold">
                              {order.address.label || "Delivery Address"}
                            </h4>
                            <p className="text-muted-foreground">
                              {order.address.addressLine1}
                              {order.address.addressLine2 &&
                                `, ${order.address.addressLine2}`}
                            </p>
                            <p className="text-muted-foreground">
                              {order.address.city}, {order.address.state}{" "}
                              {order.address.postalCode}
                            </p>
                          </div>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            You will receive a confirmation call before
                            delivery. Please ensure someone is available at the
                            address.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Self Pickup</p>
                        <p className="text-sm">
                          Please collect from our warehouse during business
                          hours
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payment" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-4 border-b">
                        <div>
                          <p className="font-semibold">Payment Method</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {order.payment?.method?.replace("_", " ") || "N/A"}
                          </p>
                        </div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 capitalize">
                          {order.payment?.status || "Completed"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Subtotal
                          </span>
                          <span>₹{order.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Tax (GST)
                          </span>
                          <span>₹{order.taxAmount.toLocaleString()}</span>
                        </div>
                        {order.discountAmount > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Discount</span>
                            <span>
                              -₹{order.discountAmount.toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Security Deposit
                          </span>
                          <span>₹{order.securityDeposit.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-2 border-t">
                          <span>Total Paid</span>
                          <span className="text-primary">
                            ₹{order.totalAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-4">
                        * Security deposit will be refunded after successful
                        return of items
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={handleTrackOrder}>
                  <Package className="h-4 w-4 mr-2" />
                  Track Order
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleDownloadInvoice}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/products")}
                >
                  Continue Shopping
                </Button>
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                  <h4 className="font-semibold">Need Help?</h4>
                  <p className="text-sm text-muted-foreground">
                    Contact our support team for any queries
                  </p>
                  <Button variant="link" className="text-primary">
                    support@rental.com
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* What's Next */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What&apos;s Next?</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs shrink-0">
                      1
                    </span>
                    <span className="text-muted-foreground">
                      You&apos;ll receive a confirmation email shortly
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs shrink-0">
                      2
                    </span>
                    <span className="text-muted-foreground">
                      Our team will contact you before delivery
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs shrink-0">
                      3
                    </span>
                    <span className="text-muted-foreground">
                      Items will be delivered on the scheduled date
                    </span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
