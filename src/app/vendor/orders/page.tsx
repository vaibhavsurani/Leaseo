"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  MoreHorizontal,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Truck,
  RotateCcw,
  Send,
  Download,
  Upload,
  Printer,
} from "lucide-react";
import {
  getVendorOrders,
  getVendorQuotations,
  updateOrderStatus,
  createInvoice,
  convertQuotationToOrder,
  sendQuotationToCustomer,
  VendorOrder,
  VendorQuotation,
} from "@/actions/vendor";
import { OrderStatus, QuotationStatus } from "@prisma/client";
import { format } from "date-fns";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  QUOTATION: "bg-gray-100 text-gray-800 border-gray-300",
  DRAFT: "bg-gray-100 text-gray-800 border-gray-300",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-300",
  IN_PROGRESS: "bg-orange-100 text-orange-800 border-orange-300",
  COMPLETED: "bg-green-100 text-green-800 border-green-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-300",
};

const statusLabels: Record<string, string> = {
  QUOTATION: "Quotation",
  DRAFT: "Quotation",
  CONFIRMED: "Sale Order",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Invoiced",
  CANCELLED: "Cancelled",
};

const kanbanColumns = [
  { status: "QUOTATION", title: "Quotation", color: "border-gray-400" },
  { status: "CONFIRMED", title: "Sale Order", color: "border-blue-400" },
  { status: "IN_PROGRESS", title: "Confirmed", color: "border-orange-400" },
  { status: "COMPLETED", title: "Invoiced", color: "border-green-400" },
  { status: "CANCELLED", title: "Cancelled", color: "border-red-400" },
];

// Unified type for displaying both orders and quotations
type UnifiedOrderItem = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
  items: {
    id: string;
    productId: string;
    productName: string;
    productImage: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    rentalStartDate: Date;
    rentalEndDate: Date;
  }[];
  address: {
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  isQuotation: boolean;
  quotationStatus?: string; // DRAFT or SENT for quotations
  validUntil?: Date;
};

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<UnifiedOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pickupFilter, setPickupFilter] = useState(false);
  const [returnFilter, setReturnFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Fetch both orders and quotations in parallel
      const [ordersResult, quotationsResult] = await Promise.all([
        getVendorOrders({
          search: search || undefined,
          status:
            statusFilter !== "all" && statusFilter !== "QUOTATION"
              ? (statusFilter as OrderStatus)
              : undefined,
          page,
          limit: viewMode === "kanban" ? 100 : 10,
        }),
        getVendorQuotations({
          search: search || undefined,
          status:
            statusFilter === "QUOTATION"
              ? ("DRAFT" as QuotationStatus)
              : statusFilter === "CANCELLED"
                ? ("CANCELLED" as QuotationStatus)
                : undefined,
          page,
          limit: viewMode === "kanban" ? 100 : 10,
        }),
      ]);

      const unifiedOrders: UnifiedOrderItem[] = [];

      // Add orders (excluding DRAFT status as those are now quotations)
      if (ordersResult.success && ordersResult.data) {
        ordersResult.data.orders
          .filter((order) => order.status !== "DRAFT")
          .forEach((order) => {
            unifiedOrders.push({
              ...order,
              isQuotation: false,
            });
          });
      }

      // Add quotations (only DRAFT and SENT status - not yet converted to orders)
      if (quotationsResult.success && quotationsResult.data) {
        quotationsResult.data.quotations
          .filter((q) => q.status === "DRAFT" || q.status === "SENT")
          .forEach((quotation) => {
            unifiedOrders.push({
              id: quotation.id,
              orderNumber: quotation.quotationNumber,
              status: "QUOTATION", // Use special status for quotations
              totalAmount: quotation.totalAmount,
              createdAt: quotation.createdAt,
              customer: quotation.customer,
              items: quotation.items,
              address: quotation.address,
              isQuotation: true,
              quotationStatus: quotation.status, // Track DRAFT or SENT
              validUntil: quotation.validUntil,
            });
          });
      }

      // Sort by creation date (newest first)
      unifiedOrders.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setOrders(unifiedOrders);
      setTotal(unifiedOrders.length);
      setTotalPages(1);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search, statusFilter, page, viewMode]);

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      const result = await updateOrderStatus(orderId, status);
      if (result.success) {
        toast.success("Order status updated");
        fetchOrders();
      } else if (result.requiresRefund) {
        // Order has payment, need to process refund
        toast.info("Processing refund...");
        try {
          const refundResponse = await fetch("/api/payment/refund", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId,
              reason: "Vendor cancelled the order",
              isVendor: true,
            }),
          });

          const refundResult = await refundResponse.json();

          if (refundResult.success) {
            toast.success(
              refundResult.refund
                ? `Order cancelled. Refund of ₹${refundResult.refund.amount} initiated.`
                : "Order cancelled successfully",
            );
            fetchOrders();
          } else {
            toast.error(refundResult.error || "Failed to process refund");
          }
        } catch (refundError) {
          toast.error("Failed to process refund. Please try again.");
        }
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleConvertToOrder = async (quotationId: string) => {
    try {
      const result = await convertQuotationToOrder(quotationId);
      if (result.success) {
        toast.success("Quotation converted to Sale Order");
        fetchOrders();
      } else {
        toast.error(result.error || "Failed to convert quotation");
      }
    } catch (error) {
      toast.error("Failed to convert quotation");
    }
  };

  const handleSendQuotation = async (quotationId: string) => {
    try {
      const result = await sendQuotationToCustomer(quotationId);
      if (result.success) {
        toast.success("Quotation sent to customer");
        fetchOrders();
      } else {
        toast.error(result.error || "Failed to send quotation");
      }
    } catch (error) {
      toast.error("Failed to send quotation");
    }
  };

  const handleCreateInvoice = async (orderId: string) => {
    try {
      const result = await createInvoice(orderId);
      if (result.success) {
        toast.success("Invoice created successfully");
      } else {
        toast.error(result.error || "Failed to create invoice");
      }
    } catch (error) {
      toast.error("Failed to create invoice");
    }
  };

  // Filter orders for Pickup (invoiced and paid orders - ready for pickup)
  const getPickupOrders = () => {
    return orders.filter(
      (order) => order.status === "COMPLETED" && !order.isQuotation,
    );
  };

  // Filter orders for Return (return dates approaching within 1 day or passed)
  const getReturnOrders = () => {
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return orders.filter((order) => {
      if (order.isQuotation || order.status === "CANCELLED") return false;

      // Check if any item has a return date approaching or passed
      return order.items.some((item) => {
        const endDate = new Date(item.rentalEndDate);
        return endDate <= oneDayFromNow;
      });
    });
  };

  const getOrdersByStatus = (status: string) => {
    const baseOrders = pickupFilter
      ? getPickupOrders()
      : returnFilter
        ? getReturnOrders()
        : orders;
    return baseOrders.filter((order) => order.status === status);
  };

  const statusCounts = {
    QUOTATION: getOrdersByStatus("QUOTATION").length,
    CONFIRMED: getOrdersByStatus("CONFIRMED").length,
    IN_PROGRESS: getOrdersByStatus("IN_PROGRESS").length,
    COMPLETED: getOrdersByStatus("COMPLETED").length,
    CANCELLED: getOrdersByStatus("CANCELLED").length,
  };

  // Get filtered orders based on current filter state
  const getFilteredOrders = () => {
    if (pickupFilter) {
      return getPickupOrders();
    }
    if (returnFilter) {
      return getReturnOrders();
    }
    return orders;
  };

  const filteredOrders = getFilteredOrders();

  // Pickup and Return counts
  const pickupCount = getPickupOrders().length;
  const returnCount = getReturnOrders().length;

  // Export orders to CSV
  const handleExportCSV = () => {
    const dataToExport = filteredOrders;

    if (dataToExport.length === 0) {
      toast.error("No orders to export");
      return;
    }

    const headers = [
      "Order Number",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Status",
      "Total Amount",
      "Created Date",
      "Products",
      "Rental Start",
      "Rental End",
      "Address",
    ];

    const rows = dataToExport.map((order) => {
      const customerName =
        [order.customer.firstName, order.customer.lastName]
          .filter(Boolean)
          .join(" ") || "N/A";
      const products = order.items
        .map((item) => `${item.productName} (x${item.quantity})`)
        .join("; ");
      const rentalStart = order.items[0]
        ? format(new Date(order.items[0].rentalStartDate), "yyyy-MM-dd")
        : "";
      const rentalEnd = order.items[0]
        ? format(new Date(order.items[0].rentalEndDate), "yyyy-MM-dd")
        : "";
      const address = order.address
        ? `${order.address.addressLine1}, ${order.address.city}, ${order.address.state} ${order.address.postalCode}`
        : "";

      return [
        order.orderNumber,
        customerName,
        order.customer.email || "",
        order.customer.phone || "",
        order.isQuotation
          ? "Quotation"
          : statusLabels[order.status] || order.status,
        order.totalAmount.toFixed(2),
        format(new Date(order.createdAt), "yyyy-MM-dd"),
        products,
        rentalStart,
        rentalEnd,
        address,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rental-orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast.success(`Exported ${dataToExport.length} orders to CSV`);
  };

  // Export orders to Excel (XLSX format via CSV with proper encoding)
  const handleExportExcel = () => {
    const dataToExport = filteredOrders;

    if (dataToExport.length === 0) {
      toast.error("No orders to export");
      return;
    }

    const headers = [
      "Order Number",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Status",
      "Total Amount",
      "Created Date",
      "Products",
      "Quantity",
      "Unit Price",
      "Rental Start",
      "Rental End",
      "Address",
    ];

    const rows: string[][] = [];

    dataToExport.forEach((order) => {
      const customerName =
        [order.customer.firstName, order.customer.lastName]
          .filter(Boolean)
          .join(" ") || "N/A";
      const address = order.address
        ? `${order.address.addressLine1}, ${order.address.city}, ${order.address.state} ${order.address.postalCode}`
        : "";

      order.items.forEach((item, index) => {
        rows.push([
          index === 0 ? order.orderNumber : "",
          index === 0 ? customerName : "",
          index === 0 ? order.customer.email || "" : "",
          index === 0 ? order.customer.phone || "" : "",
          index === 0
            ? order.isQuotation
              ? "Quotation"
              : statusLabels[order.status] || order.status
            : "",
          index === 0 ? order.totalAmount.toFixed(2) : "",
          index === 0 ? format(new Date(order.createdAt), "yyyy-MM-dd") : "",
          item.productName,
          item.quantity.toString(),
          item.unitPrice.toFixed(2),
          format(new Date(item.rentalStartDate), "yyyy-MM-dd"),
          format(new Date(item.rentalEndDate), "yyyy-MM-dd"),
          index === 0 ? address : "",
        ]);
      });
    });

    // Add BOM for Excel to recognize UTF-8
    const BOM = "\uFEFF";
    const csvContent =
      BOM +
      [
        headers.join("\t"),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join("\t"),
        ),
      ].join("\n");

    const blob = new Blob([csvContent], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rental-orders-${format(new Date(), "yyyy-MM-dd")}.xls`;
    link.click();

    toast.success(`Exported ${dataToExport.length} orders to Excel`);
  };

  // Handle import from file (placeholder - would need backend support)
  const handleImportFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx,.xls";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // For now, just show a message - full import would need backend support
      toast.info(
        `Import functionality coming soon. Selected file: ${file.name}`,
      );
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rental Orders</h1>
          <p className="text-muted-foreground">
            Manage and track all your rental orders
          </p>
        </div>
        <Button asChild>
          <Link href="/vendor/orders/new">
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Link>
        </Button>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="QUOTATION">Quotation</SelectItem>
              <SelectItem value="CONFIRMED">Sale Order</SelectItem>
              <SelectItem value="IN_PROGRESS">Confirmed</SelectItem>
              <SelectItem value="COMPLETED">Invoiced</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {/* Pickup/Return filters */}
          <Button
            variant={pickupFilter ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setPickupFilter(!pickupFilter);
              setReturnFilter(false);
            }}
            className={pickupFilter ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <Truck className="mr-2 h-4 w-4" />
            Pickup
            {pickupCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {pickupCount}
              </Badge>
            )}
          </Button>
          <Button
            variant={returnFilter ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setReturnFilter(!returnFilter);
              setPickupFilter(false);
            }}
            className={returnFilter ? "bg-orange-600 hover:bg-orange-700" : ""}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Return
            {returnCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {returnCount}
              </Badge>
            )}
          </Button>

          {/* Export/Import */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileText className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileText className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={handleImportFile}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>

          {/* View Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="flex flex-wrap gap-2 items-center">
        {(pickupFilter || returnFilter) && (
          <Badge
            variant="default"
            className={`text-sm ${pickupFilter ? "bg-green-600" : "bg-orange-600"}`}
          >
            {pickupFilter ? "Showing Pickup Orders" : "Showing Return Orders"}
            <button
              className="ml-2 hover:opacity-80"
              onClick={() => {
                setPickupFilter(false);
                setReturnFilter(false);
              }}
            >
              ×
            </button>
          </Badge>
        )}
        <Badge variant="outline" className="text-sm">
          Total: {filteredOrders.length}
        </Badge>
        <Badge
          variant="outline"
          className="text-sm border-orange-300 text-orange-700"
        >
          Sale Order: {statusCounts.CONFIRMED}
        </Badge>
        <Badge
          variant="outline"
          className="text-sm border-gray-300 text-gray-700"
        >
          Quotation: {statusCounts.QUOTATION}
        </Badge>
        <Badge
          variant="outline"
          className="text-sm border-green-300 text-green-700"
        >
          Invoiced: {statusCounts.COMPLETED}
        </Badge>
        <Badge
          variant="outline"
          className="text-sm border-blue-300 text-blue-700"
        >
          Confirmed: {statusCounts.IN_PROGRESS}
        </Badge>
        <Badge
          variant="outline"
          className="text-sm border-red-300 text-red-700"
        >
          Cancelled: {statusCounts.CANCELLED}
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : viewMode === "kanban" ? (
        /* Kanban View */
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 min-w-max">
            {kanbanColumns.map((column) => (
              <div
                key={column.status}
                className={`flex-shrink-0 w-72 bg-muted/50 rounded-lg border-t-4 ${column.color}`}
              >
                <div className="p-3 border-b bg-background rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{column.title}</h3>
                    <Badge variant="secondary">
                      {getOrdersByStatus(column.status).length}
                    </Badge>
                  </div>
                </div>
                <ScrollArea className="h-[calc(100vh-380px)]">
                  <div className="p-2 space-y-2">
                    {getOrdersByStatus(column.status).map((order) => (
                      <Card
                        key={order.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-sm">
                                {order.customer.firstName}{" "}
                                {order.customer.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {order.orderNumber}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={
                                      order.isQuotation
                                        ? `/vendor/orders/new?edit=${order.id}`
                                        : `/vendor/orders/${order.id}`
                                    }
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                {order.isQuotation &&
                                  order.quotationStatus === "DRAFT" && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleSendQuotation(order.id)
                                      }
                                    >
                                      <Send className="mr-2 h-4 w-4" />
                                      Send to Customer
                                    </DropdownMenuItem>
                                  )}
                                {order.isQuotation &&
                                  order.quotationStatus === "SENT" && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleConvertToOrder(order.id)
                                      }
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Convert to Sale Order
                                    </DropdownMenuItem>
                                  )}
                                {order.status === "CONFIRMED" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleStatusChange(
                                          order.id,
                                          "IN_PROGRESS",
                                        )
                                      }
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Mark In Progress
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleCreateInvoice(order.id)
                                      }
                                    >
                                      <FileText className="mr-2 h-4 w-4" />
                                      Create Invoice
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {order.status !== "CANCELLED" &&
                                  order.status !== "COMPLETED" &&
                                  !order.isQuotation && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleStatusChange(
                                          order.id,
                                          "CANCELLED",
                                        )
                                      }
                                      className="text-red-600"
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Cancel Order
                                    </DropdownMenuItem>
                                  )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="space-y-1">
                            {order.items.slice(0, 1).map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between text-xs"
                              >
                                <span className="text-muted-foreground truncate max-w-[120px]">
                                  {item.productName}
                                </span>
                                <span>₹{item.totalPrice.toLocaleString()}</span>
                              </div>
                            ))}
                            {order.items.length > 1 && (
                              <p className="text-xs text-muted-foreground">
                                +{order.items.length - 1} more items
                              </p>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t">
                            <span className="text-xs text-muted-foreground">
                              {order.isQuotation ? "Status" : "Rental Duration"}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                order.isQuotation &&
                                order.quotationStatus === "DRAFT"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : order.isQuotation &&
                                      order.quotationStatus === "SENT"
                                    ? "bg-blue-100 text-blue-800"
                                    : ""
                              }`}
                            >
                              {order.isQuotation
                                ? order.quotationStatus === "DRAFT"
                                  ? "Draft"
                                  : "Sent"
                                : statusLabels[order.status]}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {getOrdersByStatus(column.status).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No orders
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        /* List View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input type="checkbox" className="rounded border-gray-300" />
                </TableHead>
                <TableHead>Order Reference</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Rental Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>
                    {format(new Date(order.createdAt), "MMM dd")}
                  </TableCell>
                  <TableCell>
                    {order.customer.firstName} {order.customer.lastName}
                  </TableCell>
                  <TableCell>
                    {order.items[0]?.productName || "-"}
                    {order.items.length > 1 && (
                      <span className="text-muted-foreground text-xs ml-1">
                        +{order.items.length - 1}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>₹{order.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        order.isQuotation && order.quotationStatus === "DRAFT"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                          : order.isQuotation &&
                              order.quotationStatus === "SENT"
                            ? "bg-blue-100 text-blue-800 border-blue-300"
                            : statusColors[order.status]
                      }
                    >
                      {order.isQuotation
                        ? order.quotationStatus === "DRAFT"
                          ? "Draft"
                          : "Sent to Customer"
                        : statusLabels[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={
                              order.isQuotation
                                ? `/vendor/orders/new?edit=${order.id}`
                                : `/vendor/orders/${order.id}`
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {order.isQuotation &&
                          order.quotationStatus === "DRAFT" && (
                            <DropdownMenuItem
                              onClick={() => handleSendQuotation(order.id)}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Send to Customer
                            </DropdownMenuItem>
                          )}
                        {order.isQuotation &&
                          order.quotationStatus === "SENT" && (
                            <DropdownMenuItem
                              onClick={() => handleConvertToOrder(order.id)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Convert to Sale Order
                            </DropdownMenuItem>
                          )}
                        {order.status === "CONFIRMED" && (
                          <DropdownMenuItem
                            onClick={() => handleCreateInvoice(order.id)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Create Invoice
                          </DropdownMenuItem>
                        )}
                        {order.status !== "CANCELLED" &&
                          order.status !== "COMPLETED" &&
                          !order.isQuotation && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(order.id, "CANCELLED")
                              }
                              className="text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel Order
                            </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground">No orders found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
