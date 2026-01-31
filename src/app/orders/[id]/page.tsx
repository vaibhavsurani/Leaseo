"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Calendar,
  MapPin,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  XCircle,
  RefreshCcw,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOrderById, cancelOrder, OrderWithDetails } from "@/actions/orders";
import { toast } from "sonner";
import { format } from "date-fns";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [refundInfo, setRefundInfo] = useState<{
    id: string;
    amount: number;
    status: string;
  } | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        const orderData = await getOrderById(orderId);
        setOrder(orderData);
      } catch (error) {
        console.error("Error fetching order:", error);
        toast.error("Failed to load order details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!order) return;

    setIsCancelling(true);

    try {
      // First try server action
      const result = await cancelOrder(order.id, cancelReason);

      if (result.success) {
        setOrder((prev) => (prev ? { ...prev, status: "cancelled" } : null));
        setShowCancelDialog(false);
        toast.success("Order cancelled successfully");
        return;
      }

      // Check if refund is required
      if ((result as { requiresRefund?: boolean }).requiresRefund) {
        // Call the refund API
        const refundResponse = await fetch("/api/payment/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            reason: cancelReason || "Customer requested cancellation",
          }),
        });

        const refundData = await refundResponse.json();

        if (!refundResponse.ok) {
          throw new Error(refundData.error || "Failed to process refund");
        }

        setRefundInfo({
          id: refundData.refundId,
          amount: refundData.refundAmount,
          status: refundData.refundStatus,
        });

        setOrder((prev) => (prev ? { ...prev, status: "cancelled" } : null));
        setShowCancelDialog(false);
        toast.success("Order cancelled and refund initiated!");
      } else {
        toast.error(result.error || "Failed to cancel order");
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel order",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!order) return;

    // Generate invoice HTML
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice - ${order.orderNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #333; padding: 40px; }
          .invoice-container { max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #6366f1; }
          .logo { font-size: 32px; font-weight: bold; color: #6366f1; }
          .invoice-title { text-align: right; }
          .invoice-title h1 { font-size: 28px; color: #333; margin-bottom: 5px; }
          .invoice-title p { color: #666; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info-box { width: 48%; }
          .info-box h3 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 10px; letter-spacing: 1px; }
          .info-box p { margin-bottom: 5px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .items-table th { background: #f8f9fa; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #dee2e6; }
          .items-table td { padding: 12px; border-bottom: 1px solid #dee2e6; }
          .items-table .text-right { text-align: right; }
          .totals { margin-left: auto; width: 300px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .totals-row.total { font-weight: bold; font-size: 18px; border-bottom: none; padding-top: 15px; color: #6366f1; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
          .status-confirmed { background: #dbeafe; color: #1e40af; }
          .status-completed { background: #dcfce7; color: #166534; }
          .status-cancelled { background: #fee2e2; color: #991b1b; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="logo">RentIt</div>
            <div class="invoice-title">
              <h1>INVOICE</h1>
              <p>${order.orderNumber}</p>
              <p>${format(new Date(order.createdAt), "MMMM dd, yyyy")}</p>
              <span class="status-badge status-${order.status}">${order.status}</span>
            </div>
          </div>

          <div class="info-section">
            <div class="info-box">
              <h3>Bill To</h3>
              ${
                order.address
                  ? `
                <p><strong>${order.address.label || "Delivery Address"}</strong></p>
                <p>${order.address.addressLine1}</p>
                ${order.address.addressLine2 ? `<p>${order.address.addressLine2}</p>` : ""}
                <p>${order.address.city}, ${order.address.state} ${order.address.postalCode}</p>
                <p>${order.address.country}</p>
              `
                  : "<p>Self Pickup</p>"
              }
            </div>
            <div class="info-box">
              <h3>Order Details</h3>
              <p><strong>Order Date:</strong> ${format(new Date(order.createdAt), "MMM dd, yyyy")}</p>
              ${order.confirmedAt ? `<p><strong>Confirmed:</strong> ${format(new Date(order.confirmedAt), "MMM dd, yyyy")}</p>` : ""}
              <p><strong>Delivery Method:</strong> ${order.deliveryMethod === "delivery" ? "Home Delivery" : order.deliveryMethod === "scheduled" ? "Scheduled Delivery" : "Self Pickup"}</p>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Rental Period</th>
                <th>Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items
                .map(
                  (item) => `
                <tr>
                  <td>
                    <strong>${item.productName}</strong>
                    ${item.variantName ? `<br><small style="color: #666;">Variant: ${item.variantName}</small>` : ""}
                  </td>
                  <td>${format(new Date(item.rentalStartDate), "MMM dd")} - ${format(new Date(item.rentalEndDate), "MMM dd, yyyy")}<br><small style="color: #666;">${item.periodDuration} days</small></td>
                  <td>${item.quantity}</td>
                  <td class="text-right">₹${item.unitPrice.toLocaleString()}</td>
                  <td class="text-right">₹${item.totalPrice.toLocaleString()}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal</span>
              <span>₹${order.subtotal.toLocaleString()}</span>
            </div>
            <div class="totals-row">
              <span>Tax (GST 18%)</span>
              <span>₹${order.taxAmount.toLocaleString()}</span>
            </div>
            ${
              order.deliveryCharge > 0
                ? `
              <div class="totals-row">
                <span>Delivery Charge</span>
                <span>₹${order.deliveryCharge.toLocaleString()}</span>
              </div>
            `
                : ""
            }
            <div class="totals-row">
              <span>Security Deposit</span>
              <span>₹${order.securityDeposit.toLocaleString()}</span>
            </div>
            ${
              order.discountAmount > 0
                ? `
              <div class="totals-row" style="color: #16a34a;">
                <span>Discount</span>
                <span>-₹${order.discountAmount.toLocaleString()}</span>
              </div>
            `
                : ""
            }
            <div class="totals-row total">
              <span>Total Amount</span>
              <span>₹${order.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for choosing RentIt!</p>
            <p style="margin-top: 5px;">For any queries, contact us at support@rentit.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([invoiceHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Invoice-${order.orderNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Invoice downloaded successfully!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTimeline = () => {
    const stages = [
      { status: "confirmed", label: "Order Confirmed" },
      { status: "in-progress", label: "In Progress" },
      { status: "completed", label: "Completed" },
    ];

    const currentIndex = stages.findIndex((s) => s.status === order?.status);

    return stages.map((stage, index) => ({
      ...stage,
      completed: index < currentIndex || order?.status === "completed",
      current: index === currentIndex,
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading order details...</p>
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
              The order you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button onClick={() => router.push("/orders")}>
              View All Orders
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
  const rentalDays = firstItem ? firstItem.periodDuration : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{order.orderNumber}</h1>
              <p className="text-muted-foreground">
                Ordered on {format(new Date(order.createdAt), "MMM dd, yyyy")}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-block px-4 py-2 rounded-full text-sm font-semibold capitalize ${getStatusColor(order.status)}`}
              >
                {order.status.replace("-", " ")}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            {order.status !== "cancelled" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Order Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {getTimeline().map((item, index, arr) => (
                      <div key={item.status} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          {item.completed ? (
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                          ) : item.current ? (
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <div className="h-3 w-3 bg-blue-600 rounded-full animate-pulse" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-full border-2 border-gray-300" />
                          )}
                          {index < arr.length - 1 && (
                            <div
                              className={`w-px h-12 ${
                                item.completed ? "bg-green-300" : "bg-gray-200"
                              }`}
                            />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="font-semibold">{item.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="items">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="delivery">Delivery</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>

              {/* Items Tab */}
              <TabsContent value="items">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Rental Items</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center shrink-0">
                          {item.productImage ? (
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="w-full h-full object-cover rounded-md"
                            />
                          ) : (
                            <Package className="h-8 w-8 text-muted-foreground opacity-50" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.productName}</h4>
                          {item.variantName && (
                            <p className="text-sm text-muted-foreground">
                              {item.variantName}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity}
                          </p>
                          <p className="text-sm mt-1">
                            ₹{item.unitPrice}/day × {item.periodDuration} days ={" "}
                            <span className="font-semibold">
                              ₹{item.totalPrice.toLocaleString()}
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Rental Period */}
                    {firstItem && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          <h4 className="font-semibold text-blue-900">
                            Rental Period
                          </h4>
                        </div>
                        <p className="text-sm text-blue-800">
                          {format(rentalStartDate, "MMM dd, yyyy")} -{" "}
                          {format(rentalEndDate, "MMM dd, yyyy")} ({rentalDays}{" "}
                          days)
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Delivery Tab */}
              <TabsContent value="delivery">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Delivery Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {order.address ? (
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                          <div>
                            <h4 className="font-semibold">
                              {order.address.label || "Delivery Address"}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {order.address.addressLine1}
                              {order.address.addressLine2 &&
                                `, ${order.address.addressLine2}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {order.address.city}, {order.address.state}{" "}
                              {order.address.postalCode}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {order.address.country}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Self Pickup</p>
                        <p className="text-sm">
                          Please collect from our warehouse
                        </p>
                      </div>
                    )}

                    {/* Pickup Info */}
                    {order.pickup && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">
                          Pickup Details
                        </h4>
                        <p className="text-sm text-blue-800">
                          Pickup #{order.pickup.pickupNumber}
                        </p>
                        <p className="text-sm text-blue-800 capitalize">
                          Status: {order.pickup.status.replace("-", " ")}
                        </p>
                        {order.pickup.scheduledDate && (
                          <p className="text-sm text-blue-800">
                            Scheduled:{" "}
                            {format(
                              new Date(order.pickup.scheduledDate),
                              "MMM dd, yyyy",
                            )}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Return Info */}
                    {order.return && (
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <h4 className="font-semibold text-purple-900 mb-2">
                          Return Details
                        </h4>
                        <p className="text-sm text-purple-800">
                          Return #{order.return.returnNumber}
                        </p>
                        <p className="text-sm text-purple-800 capitalize">
                          Status: {order.return.status.replace("-", " ")}
                        </p>
                        {order.return.scheduledDate && (
                          <p className="text-sm text-purple-800">
                            Scheduled:{" "}
                            {format(
                              new Date(order.return.scheduledDate),
                              "MMM dd, yyyy",
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Summary Tab */}
              <TabsContent value="summary">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>₹{order.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax (GST)</span>
                        <span>₹{order.taxAmount.toLocaleString()}</span>
                      </div>
                      {order.deliveryCharge > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Delivery Charge (
                            {order.deliveryMethod === "delivery"
                              ? "Home Delivery"
                              : "Scheduled"}
                            )
                          </span>
                          <span>₹{order.deliveryCharge.toLocaleString()}</span>
                        </div>
                      )}
                      {order.discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount</span>
                          <span>-₹{order.discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Security Deposit
                        </span>
                        <span>₹{order.securityDeposit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg pt-2 border-t">
                        <span>Total</span>
                        <span className="text-primary">
                          ₹{order.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Payment Info */}
                    {order.payments.length > 0 && (
                      <div className="pt-4 border-t">
                        <h4 className="font-semibold mb-3">Payment History</h4>
                        <div className="space-y-2">
                          {order.payments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded"
                            >
                              <div>
                                <p className="font-medium">
                                  {payment.paymentNumber}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {payment.paymentMethod} •{" "}
                                  {payment.paymentType.replace("-", " ")}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">
                                  ₹{payment.amount.toLocaleString()}
                                </p>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded capitalize ${
                                    payment.status === "completed"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {payment.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {order.notes && (
                      <div className="pt-4 border-t">
                        <h4 className="font-semibold mb-2">Notes</h4>
                        <p className="text-sm text-muted-foreground">
                          {order.notes}
                        </p>
                      </div>
                    )}
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
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleDownloadInvoice}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </Button>

                {(order.status === "confirmed" || order.status === "draft") && (
                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={isCancelling}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Order
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Cancellation Notice */}
            {order.status === "cancelled" && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-900">
                        Order Cancelled
                      </h4>
                      {order.cancelledAt && (
                        <p className="text-sm text-red-800 mt-1">
                          Cancelled on{" "}
                          {format(new Date(order.cancelledAt), "MMM dd, yyyy")}
                        </p>
                      )}
                      <p className="text-sm text-red-700 mt-2">
                        Your security deposit will be refunded within 5-7
                        business days.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Refund Information */}
            {refundInfo && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <RefreshCcw className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900">
                        Refund Initiated
                      </h4>
                      <p className="text-sm text-green-800 mt-1">
                        Refund ID: {refundInfo.id}
                      </p>
                      {refundInfo.amount && (
                        <p className="text-sm text-green-800">
                          Amount: ₹{refundInfo.amount.toLocaleString()}
                        </p>
                      )}
                      <p className="text-sm text-green-700 mt-2 flex items-center gap-1">
                        <Banknote className="h-4 w-4" />
                        Status: {refundInfo.status || "Processing"}
                      </p>
                      <p className="text-xs text-green-600 mt-2">
                        Refund will be credited to your original payment method
                        within 5-7 business days.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Help */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <h4 className="font-semibold">Need Help?</h4>
                  <p className="text-sm text-muted-foreground">
                    Contact our support for any questions
                  </p>
                  <Button variant="link" className="text-primary">
                    support@rental.com
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Cancel Order Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Cancel Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to cancel this order? This action cannot
                be undone.
              </p>

              {/* Check if payment was made via Razorpay */}
              {order.payments.some((p) => p.transactionId) && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <RefreshCcw className="h-4 w-4" />
                    <span className="font-medium">
                      Refund will be processed
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Amount: ₹{order.totalAmount.toLocaleString()} will be
                    refunded to your original payment method.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason for cancellation (optional)
                </label>
                <textarea
                  className="w-full min-h-[80px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Please let us know why you're cancelling..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowCancelDialog(false);
                    setCancelReason("");
                  }}
                  disabled={isCancelling}
                >
                  Keep Order
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Order
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
