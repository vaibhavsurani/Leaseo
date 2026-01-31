"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  Printer,
  Mail,
  Calendar,
  FileText,
  XCircle,
  Download,
} from "lucide-react";
import {
  getVendorInvoices,
  updateInvoiceStatus,
  VendorInvoice,
} from "@/actions/vendor";
import { format } from "date-fns";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SENT: "bg-blue-100 text-blue-800",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-600",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Posted",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<VendorInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvoice = async () => {
    try {
      // Get invoice by fetching all and filtering - ideally would have a getInvoiceById
      const result = await getVendorInvoices({ limit: 100 });
      if (result.success && result.data) {
        const found = result.data.invoices.find((i) => i.id === params.id);
        if (found) {
          setInvoice(found);
        } else {
          toast.error("Invoice not found");
          router.push("/vendor/invoices");
        }
      }
    } catch (error) {
      toast.error("Failed to fetch invoice");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  const handleStatusChange = async (status: any) => {
    if (!invoice) return;
    try {
      const result = await updateInvoiceStatus(invoice.id, status);
      if (result.success) {
        toast.success("Invoice status updated");
        fetchInvoice();
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handlePrint = () => {
    if (!invoice) return;

    const customerName =
      [invoice.customer.firstName, invoice.customer.lastName]
        .filter(Boolean)
        .join(" ") || "Customer";

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups for printing");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              padding: 40px; 
              color: #1f2937; 
              background: white;
              line-height: 1.6;
            }
            .invoice-container { max-width: 800px; margin: 0 auto; }
            
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start;
              margin-bottom: 50px; 
              padding-bottom: 30px;
              border-bottom: 3px solid #6366f1;
            }
            .company-info h1 { 
              font-size: 28px; 
              color: #6366f1; 
              margin-bottom: 5px;
            }
            .company-info p { color: #6b7280; font-size: 14px; }
            
            .invoice-meta { text-align: right; }
            .invoice-title { 
              font-size: 36px; 
              font-weight: bold; 
              color: #6366f1; 
              letter-spacing: 2px;
            }
            .invoice-number { 
              font-size: 16px; 
              color: #6b7280; 
              margin-top: 5px;
            }
            
            .status-badge {
              display: inline-block;
              padding: 6px 16px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              margin-top: 10px;
            }
            .status-DRAFT { background: #f3f4f6; color: #374151; }
            .status-SENT { background: #dbeafe; color: #1e40af; }
            .status-PAID { background: #dcfce7; color: #166534; }
            .status-OVERDUE { background: #fee2e2; color: #991b1b; }
            
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
            }
            .detail-section h3 {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #9ca3af;
              margin-bottom: 10px;
            }
            .detail-section p { margin: 4px 0; }
            .detail-section .name { font-weight: 600; font-size: 18px; }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 30px 0;
            }
            .items-table th {
              background: #f9fafb;
              padding: 14px 16px;
              text-align: left;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #6b7280;
              border-bottom: 2px solid #e5e7eb;
            }
            .items-table td {
              padding: 16px;
              border-bottom: 1px solid #f3f4f6;
            }
            .items-table .text-right { text-align: right; }
            
            .totals-section {
              margin-left: auto;
              width: 300px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .totals-row.total {
              border-bottom: none;
              padding-top: 15px;
              margin-top: 10px;
              border-top: 2px solid #e5e7eb;
            }
            .totals-row.total .label,
            .totals-row.total .value {
              font-size: 20px;
              font-weight: bold;
            }
            .totals-row.total .value { color: #6366f1; }
            
            .footer {
              margin-top: 60px;
              padding-top: 30px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #9ca3af;
              font-size: 13px;
            }
            .footer p { margin: 5px 0; }
            
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-info">
                <h1>Your Company</h1>
                <p>Rental Services</p>
                <p>contact@yourcompany.com</p>
              </div>
              <div class="invoice-meta">
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-number">${invoice.invoiceNumber}</div>
                <div class="status-badge status-${invoice.status}">${statusLabels[invoice.status]}</div>
              </div>
            </div>

            <div class="details-grid">
              <div class="detail-section">
                <h3>Bill To</h3>
                <p class="name">${customerName}</p>
                <p>${invoice.customer.email || ""}</p>
              </div>
              <div class="detail-section" style="text-align: right;">
                <h3>Invoice Details</h3>
                <p><strong>Invoice Date:</strong> ${format(new Date(invoice.createdAt), "MMMM dd, yyyy")}</p>
                <p><strong>Due Date:</strong> ${format(new Date(invoice.dueDate), "MMMM dd, yyyy")}</p>
                <p><strong>Order Ref:</strong> ${invoice.order.orderNumber}</p>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Rental Order</strong><br>
                    <span style="color: #6b7280; font-size: 14px;">Reference: ${invoice.order.orderNumber}</span>
                  </td>
                  <td class="text-right">₹${invoice.totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div class="totals-section">
              <div class="totals-row">
                <span class="label">Subtotal</span>
                <span class="value">₹${invoice.totalAmount.toLocaleString()}</span>
              </div>
              <div class="totals-row">
                <span class="label">Tax (0%)</span>
                <span class="value">₹0</span>
              </div>
              <div class="totals-row">
                <span class="label">Amount Paid</span>
                <span class="value">₹${invoice.paidAmount.toLocaleString()}</span>
              </div>
              <div class="totals-row total">
                <span class="label">Balance Due</span>
                <span class="value">₹${(invoice.totalAmount - invoice.paidAmount).toLocaleString()}</span>
              </div>
            </div>

            <div class="footer">
              <p><strong>Thank you for your business!</strong></p>
              <p>Payment is due within 30 days of invoice date.</p>
              <p style="margin-top: 20px; font-size: 11px;">
                Generated on ${format(new Date(), "MMMM dd, yyyy 'at' h:mm a")}
              </p>
            </div>
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button asChild className="mt-4">
          <Link href="/vendor/invoices">Back to Invoices</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/vendor/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Invoice</h1>
              <Badge className={statusColors[invoice.status]}>
                {statusLabels[invoice.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">{invoice.invoiceNumber}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {invoice.status === "DRAFT" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("SENT")}
              >
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
              <Button size="sm" onClick={() => handleStatusChange("PAID")}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-4 border-b pb-4">
        <Button
          variant={invoice.status === "DRAFT" ? "default" : "ghost"}
          size="sm"
        >
          Draft
        </Button>
        <Button
          variant={invoice.status === "PAID" ? "default" : "ghost"}
          size="sm"
        >
          Posted
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">
                      {invoice.customer.firstName} {invoice.customer.lastName}
                    </p>
                    {invoice.customer.email && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {invoice.customer.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Invoice Address
                    </p>
                    <p className="text-sm">Address line will appear here</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Delivery Address
                    </p>
                    <p className="text-sm">Address line will appear here</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Rental Period
                      </p>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Start date
                          </p>
                          <p className="font-medium text-sm">-</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            End date
                          </p>
                          <p className="font-medium text-sm">-</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Invoice Date
                    </p>
                    <p className="font-medium">
                      {format(new Date(invoice.createdAt), "PPP")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-medium">
                      {format(new Date(invoice.dueDate), "PPP")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Lines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Lines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">
                        Product
                      </th>
                      <th className="text-center p-3 text-sm font-medium">
                        Quantity
                      </th>
                      <th className="text-center p-3 text-sm font-medium">
                        Unit
                      </th>
                      <th className="text-right p-3 text-sm font-medium">
                        Unit Price
                      </th>
                      <th className="text-right p-3 text-sm font-medium">
                        Taxes
                      </th>
                      <th className="text-right p-3 text-sm font-medium">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3">
                          <span className="font-medium">
                            {item.description}
                          </span>
                        </td>
                        <td className="p-3 text-center">{item.quantity}</td>
                        <td className="p-3 text-center">Units</td>
                        <td className="p-3 text-right">
                          ₹{item.unitPrice.toLocaleString()}
                        </td>
                        <td className="p-3 text-right">18%</td>
                        <td className="p-3 text-right font-medium">
                          ₹{item.totalPrice.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add product link */}
              <div className="mt-3">
                <Button variant="link" className="p-0 h-auto text-primary">
                  Add a Product
                </Button>
                <span className="mx-2 text-muted-foreground">|</span>
                <Button
                  variant="link"
                  className="p-0 h-auto text-muted-foreground"
                >
                  Add a note
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Terms & Conditions:</span>{" "}
                <a href="#" className="text-primary underline">
                  https://xxxxx.xxx.xxx/terms
                </a>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Invoice Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{invoice.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>₹0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>-</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Untaxed Amount</span>
                <span>₹{invoice.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST (18%)</span>
                <span>₹{invoice.taxAmount.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{invoice.totalAmount.toLocaleString()}</span>
              </div>
              {invoice.paidAmount > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between text-green-600">
                    <span>Paid</span>
                    <span>₹{invoice.paidAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Balance Due</span>
                    <span>
                      ₹
                      {(
                        invoice.totalAmount - invoice.paidAmount
                      ).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Related Order</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/vendor/orders/${invoice.order.id}`}
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <FileText className="h-4 w-4" />
                {invoice.order.orderNumber}
              </Link>
            </CardContent>
          </Card>

          {/* Note */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Downpayment, Deposits, Taxes should be
                taken into consideration while calculating total amount.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
