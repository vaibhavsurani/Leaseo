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
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Send,
  CheckCircle,
  Printer,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  XCircle,
  Download,
  Upload,
} from "lucide-react";
import {
  getVendorInvoices,
  updateInvoiceStatus,
  VendorInvoice,
} from "@/actions/vendor";
import { InvoiceStatus } from "@prisma/client";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-300",
  SENT: "bg-blue-100 text-blue-800 border-blue-300",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-800 border-yellow-300",
  PAID: "bg-green-100 text-green-800 border-green-300",
  OVERDUE: "bg-red-100 text-red-800 border-red-300",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-300",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Posted",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export default function VendorInvoicesPage() {
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const result = await getVendorInvoices({
        search: search || undefined,
        status:
          statusFilter !== "all" ? (statusFilter as InvoiceStatus) : undefined,
        page,
        limit: 10,
      });

      if (result.success && result.data) {
        setInvoices(result.data.invoices);
        setTotalPages(result.data.totalPages);
        setTotal(result.data.total);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter, page]);

  const handleStatusChange = async (
    invoiceId: string,
    status: InvoiceStatus,
  ) => {
    try {
      const result = await updateInvoiceStatus(invoiceId, status);
      if (result.success) {
        toast.success("Invoice status updated");
        fetchInvoices();
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  // Calculate stats
  const stats = {
    draft: invoices.filter((i) => i.status === "DRAFT").length,
    sent: invoices.filter((i) => i.status === "SENT").length,
    paid: invoices.filter((i) => i.status === "PAID").length,
    overdue: invoices.filter((i) => i.status === "OVERDUE").length,
  };

  // Print invoice
  const handlePrintInvoice = (invoice: VendorInvoice) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups for printing");
      return;
    }

    const customerName =
      [invoice.customer.firstName, invoice.customer.lastName]
        .filter(Boolean)
        .join(" ") || "Customer";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .company { font-size: 24px; font-weight: bold; color: #6366f1; }
            .invoice-title { font-size: 32px; color: #6366f1; text-align: right; }
            .invoice-number { color: #666; text-align: right; }
            .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .bill-to { flex: 1; }
            .bill-to h3 { margin-bottom: 10px; color: #666; font-size: 12px; text-transform: uppercase; }
            .invoice-info { text-align: right; }
            .invoice-info p { margin: 5px 0; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .status-paid { background: #dcfce7; color: #166534; }
            .status-sent { background: #dbeafe; color: #1e40af; }
            .status-draft { background: #f3f4f6; color: #374151; }
            .status-overdue { background: #fee2e2; color: #991b1b; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; }
            td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
            .text-right { text-align: right; }
            .totals { margin-top: 20px; }
            .totals table { width: 300px; margin-left: auto; }
            .totals td { border: none; padding: 8px 12px; }
            .total-row { font-weight: bold; font-size: 18px; background: #f3f4f6; }
            .footer { margin-top: 60px; text-align: center; color: #666; font-size: 12px; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">Your Company</div>
              <p>Rental Services</p>
            </div>
            <div>
              <div class="invoice-title">INVOICE</div>
              <div class="invoice-number">${invoice.invoiceNumber}</div>
            </div>
          </div>
          
          <div class="details">
            <div class="bill-to">
              <h3>Bill To</h3>
              <p><strong>${customerName}</strong></p>
              <p>${invoice.customer.email || ""}</p>
            </div>
            <div class="invoice-info">
              <p><strong>Invoice Date:</strong> ${format(new Date(invoice.createdAt), "MMM dd, yyyy")}</p>
              <p><strong>Due Date:</strong> ${format(new Date(invoice.dueDate), "MMM dd, yyyy")}</p>
              <p><strong>Order:</strong> ${invoice.order.orderNumber}</p>
              <p><span class="status status-${invoice.status.toLowerCase()}">${statusLabels[invoice.status]}</span></p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Rental Order - ${invoice.order.orderNumber}</td>
                <td class="text-right">₹${invoice.totalAmount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals">
            <table>
              <tr>
                <td>Subtotal</td>
                <td class="text-right">₹${invoice.totalAmount.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Amount Paid</td>
                <td class="text-right">₹${invoice.paidAmount.toLocaleString()}</td>
              </tr>
              <tr class="total-row">
                <td>Balance Due</td>
                <td class="text-right">₹${(invoice.totalAmount - invoice.paidAmount).toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Generated on ${format(new Date(), "MMM dd, yyyy 'at' h:mm a")}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Export invoices to CSV
  const handleExportCSV = () => {
    if (invoices.length === 0) {
      toast.error("No invoices to export");
      return;
    }

    const headers = [
      "Invoice Number",
      "Customer Name",
      "Customer Email",
      "Order Number",
      "Total Amount",
      "Paid Amount",
      "Balance Due",
      "Status",
      "Invoice Date",
      "Due Date",
    ];

    const rows = invoices.map((invoice) => {
      const customerName =
        [invoice.customer.firstName, invoice.customer.lastName]
          .filter(Boolean)
          .join(" ") || "N/A";
      return [
        invoice.invoiceNumber,
        customerName,
        invoice.customer.email || "",
        invoice.order.orderNumber,
        invoice.totalAmount.toFixed(2),
        invoice.paidAmount.toFixed(2),
        (invoice.totalAmount - invoice.paidAmount).toFixed(2),
        statusLabels[invoice.status],
        format(new Date(invoice.createdAt), "yyyy-MM-dd"),
        format(new Date(invoice.dueDate), "yyyy-MM-dd"),
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
    link.download = `invoices-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast.success(`Exported ${invoices.length} invoices to CSV`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage and track your rental invoices
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button asChild>
            <Link href="/vendor/orders">
              <Plus className="mr-2 h-4 w-4" />
              Create from Order
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold">{stats.draft}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold">{stats.sent}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.paid}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.overdue}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
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
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="PAID">Posted/Paid</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">{total} invoices</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
          <p className="text-muted-foreground mb-4">
            Create an invoice from a confirmed order
          </p>
          <Button asChild>
            <Link href="/vendor/orders">View Orders</Link>
          </Button>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    {invoice.customer.firstName} {invoice.customer.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Link
                      href={`/vendor/orders/${invoice.order.id}`}
                      className="hover:underline"
                    >
                      {invoice.order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{format(new Date(invoice.dueDate), "MMM dd, yyyy")}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(invoice.dueDate), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{invoice.totalAmount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{invoice.paidAmount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[invoice.status]}>
                      {statusLabels[invoice.status]}
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
                          <Link href={`/vendor/invoices/${invoice.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {invoice.status === "DRAFT" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(invoice.id, "SENT")
                            }
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Send Invoice
                          </DropdownMenuItem>
                        )}
                        {invoice.status === "SENT" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(invoice.id, "PAID")
                            }
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Mark as Paid
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handlePrintInvoice(invoice)}
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Print Invoice
                        </DropdownMenuItem>
                        {invoice.status !== "PAID" &&
                          invoice.status !== "CANCELLED" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(invoice.id, "CANCELLED")
                              }
                              className="text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
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
