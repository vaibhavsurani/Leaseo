"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Package, Calendar, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOrders, cancelOrder } from "@/actions/orders";
import { toast } from "sonner";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rentalStartDate: Date;
  rentalEndDate: Date;
}

interface RentalOrder {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  securityDeposit: number;
  paidAmount: number;
  createdAt: Date;
  confirmedAt: Date | null;
  items: OrderItem[];
  address: {
    addressLine1: string;
    city: string;
    state: string;
  } | null;
}

const statusConfig: Record<
  string,
  { bg: string; border: string; text: string; badge: string }
> = {
  draft: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    badge: "bg-gray-100 text-gray-800",
  },
  confirmed: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-800",
  },
  "in-progress": {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    badge: "bg-green-100 text-green-800",
  },
  completed: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    badge: "bg-gray-100 text-gray-800",
  },
  cancelled: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    badge: "bg-red-100 text-red-800",
  },
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  "in-progress": "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function OrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [orders, setOrders] = useState<RentalOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const data = await getOrders(activeTab === "all" ? undefined : activeTab);
      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewOrder = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    startTransition(async () => {
      const result = await cancelOrder(orderId);
      if (result.success) {
        toast.success("Order cancelled successfully");
        fetchOrders();
      } else if ((result as { requiresRefund?: boolean }).requiresRefund) {
        // Order has Razorpay payment, need to process refund
        try {
          const refundResponse = await fetch("/api/payment/refund", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId,
              reason: "Customer requested cancellation",
            }),
          });

          const refundData = await refundResponse.json();

          if (refundData.success) {
            toast.success(
              refundData.refund
                ? `Order cancelled. Refund of ₹${refundData.refund.amount} initiated.`
                : "Order cancelled successfully",
            );
            fetchOrders();
          } else {
            toast.error(refundData.error || "Failed to process refund");
          }
        } catch (error) {
          toast.error("Failed to process refund. Please try again.");
        }
      } else {
        toast.error(result.error || "Failed to cancel order");
      }
    });
  };

  const getStatusStyle = (status: string) => {
    return statusConfig[status] || statusConfig.draft;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your rental orders
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-64">
                <div className="text-center space-y-3">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-muted-foreground">Loading orders...</p>
                </div>
              </div>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No orders found</h3>
                  <p className="text-muted-foreground mb-4">
                    {activeTab === "all"
                      ? "Start renting by browsing our products"
                      : `No ${statusLabels[activeTab]?.toLowerCase() || activeTab} orders`}
                  </p>
                  <Button onClick={() => router.push("/products")}>
                    Browse Products
                  </Button>
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => {
                const style = getStatusStyle(order.status);
                const firstItem = order.items[0];
                const rentalStart = firstItem
                  ? new Date(firstItem.rentalStartDate)
                  : null;
                const rentalEnd = firstItem
                  ? new Date(firstItem.rentalEndDate)
                  : null;

                return (
                  <Card
                    key={order.id}
                    className={`${style.bg} ${style.border} border hover:shadow-md transition-shadow cursor-pointer`}
                    onClick={() => handleViewOrder(order.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg">
                            {order.orderNumber}
                          </CardTitle>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${style.badge}`}
                          >
                            {statusLabels[order.status] || order.status}
                          </span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ordered on{" "}
                        {format(new Date(order.createdAt), "MMM dd, yyyy")}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Items Preview */}
                      <div className="space-y-2">
                        {order.items.slice(0, 2).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3"
                          >
                            <div className="w-12 h-12 bg-white rounded-md overflow-hidden flex-shrink-0 border">
                              {item.productImage ? (
                                <img
                                  src={item.productImage}
                                  alt={item.productName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                  No Image
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {item.productName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {item.quantity} × ₹
                                {item.unitPrice.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-sm text-muted-foreground">
                            +{order.items.length - 2} more items
                          </p>
                        )}
                      </div>

                      {/* Rental Period */}
                      {rentalStart && rentalEnd && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(rentalStart, "MMM dd")} -{" "}
                            {format(rentalEnd, "MMM dd, yyyy")}
                          </span>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Total Amount
                          </p>
                          <p className="font-bold text-lg">
                            ₹{order.totalAmount.toLocaleString()}
                          </p>
                        </div>
                        <div
                          className="flex gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewOrder(order.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          {(order.status === "draft" ||
                            order.status === "confirmed") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleCancelOrder(order.id)}
                              disabled={isPending}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
