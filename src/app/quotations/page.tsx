"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronRight,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getCustomerQuotations,
  rejectQuotation,
  CustomerQuotation,
} from "@/actions/orders";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast } from "date-fns";

const statusConfig: Record<
  string,
  { bg: string; border: string; text: string; badge: string; icon: any }
> = {
  SENT: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-800",
    icon: FileText,
  },
  CONFIRMED: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    badge: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  CANCELLED: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    badge: "bg-red-100 text-red-800",
    icon: XCircle,
  },
  EXPIRED: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    badge: "bg-gray-100 text-gray-800",
    icon: Clock,
  },
};

const statusLabels: Record<string, string> = {
  SENT: "Pending Review",
  CONFIRMED: "Accepted",
  CANCELLED: "Rejected",
  EXPIRED: "Expired",
};

export default function QuotationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [quotations, setQuotations] = useState<CustomerQuotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetchQuotations();
  }, [activeTab]);

  const fetchQuotations = async () => {
    setIsLoading(true);
    try {
      const data = await getCustomerQuotations(
        activeTab === "all" ? undefined : activeTab,
      );
      setQuotations(data);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      toast.error("Failed to load quotations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptAndPay = (quotationId: string) => {
    // Redirect to payment page
    router.push(`/quotations/payment?id=${quotationId}`);
  };

  const handleReject = async (quotationId: string) => {
    startTransition(async () => {
      const result = await rejectQuotation(quotationId);
      if (result.success) {
        toast.success("Quotation rejected");
        fetchQuotations();
      } else {
        toast.error(result.error || "Failed to reject quotation");
      }
    });
  };

  const getStatusCounts = () => {
    const counts = {
      all: quotations.length,
      SENT: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
      EXPIRED: 0,
    };

    quotations.forEach((q) => {
      if (counts[q.status as keyof typeof counts] !== undefined) {
        counts[q.status as keyof typeof counts]++;
      }
    });

    return counts;
  };

  const counts = getStatusCounts();

  const filteredQuotations =
    activeTab === "all"
      ? quotations
      : quotations.filter((q) => q.status === activeTab);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Quotations
          </h1>
          <p className="mt-2 text-gray-600">
            View and manage quotations from vendors
          </p>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-gray-100"
            >
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger
              value="SENT"
              className="data-[state=active]:bg-blue-100"
            >
              Pending ({counts.SENT})
            </TabsTrigger>
            <TabsTrigger
              value="CONFIRMED"
              className="data-[state=active]:bg-green-100"
            >
              Accepted ({counts.CONFIRMED})
            </TabsTrigger>
            <TabsTrigger
              value="CANCELLED"
              className="data-[state=active]:bg-red-100"
            >
              Rejected ({counts.CANCELLED})
            </TabsTrigger>
            <TabsTrigger
              value="EXPIRED"
              className="data-[state=active]:bg-gray-100"
            >
              Expired ({counts.EXPIRED})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredQuotations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">
                    No quotations found
                  </h3>
                  <p className="text-gray-500 mt-1">
                    {activeTab === "all"
                      ? "You haven't received any quotations yet."
                      : `No ${statusLabels[activeTab]?.toLowerCase() || activeTab} quotations.`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredQuotations.map((quotation) => {
                  const config =
                    statusConfig[quotation.status] || statusConfig.SENT;
                  const StatusIcon = config.icon;
                  const isExpired = isPast(new Date(quotation.validUntil));
                  const canTakeAction =
                    quotation.status === "SENT" && !isExpired;

                  return (
                    <Card
                      key={quotation.id}
                      className={`overflow-hidden border-l-4 ${config.border}`}
                    >
                      <CardHeader className={`${config.bg} py-4`}>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <StatusIcon className={`h-5 w-5 ${config.text}`} />
                            <div>
                              <CardTitle className="text-lg">
                                {quotation.quotationNumber}
                              </CardTitle>
                              <p className="text-sm text-gray-600">
                                Received{" "}
                                {format(
                                  new Date(quotation.createdAt),
                                  "MMM dd, yyyy",
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={config.badge}>
                              {statusLabels[quotation.status]}
                            </Badge>
                            {quotation.status === "SENT" && (
                              <Badge
                                variant="outline"
                                className={
                                  isExpired
                                    ? "border-red-300 text-red-700"
                                    : "border-orange-300 text-orange-700"
                                }
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                {isExpired
                                  ? "Expired"
                                  : `Valid for ${formatDistanceToNow(new Date(quotation.validUntil))}`}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="py-4">
                        {/* Vendor Info */}
                        <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                          <Building2 className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium text-sm">
                              {quotation.vendor.companyName ||
                                `${quotation.vendor.firstName || ""} ${quotation.vendor.lastName || ""}`.trim() ||
                                "Vendor"}
                            </p>
                            {quotation.vendor.email && (
                              <p className="text-xs text-gray-500">
                                {quotation.vendor.email}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-3 mb-4">
                          {quotation.items.slice(0, 2).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-4 p-3 bg-white border rounded-lg"
                            >
                              <div className="relative w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                                {item.productImage ? (
                                  <Image
                                    src={item.productImage}
                                    alt={item.productName}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {item.productName}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {format(
                                      new Date(item.rentalStartDate),
                                      "MMM dd",
                                    )}{" "}
                                    -{" "}
                                    {format(
                                      new Date(item.rentalEndDate),
                                      "MMM dd, yyyy",
                                    )}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  Qty: {item.quantity} × ₹
                                  {item.unitPrice.toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">
                                  ₹{item.totalPrice.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                          {quotation.items.length > 2 && (
                            <p className="text-sm text-gray-500 text-center">
                              +{quotation.items.length - 2} more item(s)
                            </p>
                          )}
                        </div>

                        {/* Pricing Summary */}
                        <div className="border-t pt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal</span>
                            <span>₹{quotation.subtotal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Tax (18%)</span>
                            <span>₹{quotation.taxAmount.toLocaleString()}</span>
                          </div>
                          {quotation.securityDeposit > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                Security Deposit
                              </span>
                              <span>
                                ₹{quotation.securityDeposit.toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                            <span>Total</span>
                            <span>
                              ₹{quotation.totalAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Notes */}
                        {quotation.notes && (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              <strong>Note:</strong> {quotation.notes}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        {canTakeAction && (
                          <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <Button
                              className="flex-1"
                              onClick={() => handleAcceptAndPay(quotation.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Accept & Pay ₹
                              {quotation.totalAmount.toLocaleString()}
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  disabled={isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject Quotation
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Reject this quotation?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to reject this
                                    quotation? The vendor will be notified. This
                                    action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleReject(quotation.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Yes, Reject
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}

                        {quotation.status === "CONFIRMED" && (
                          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <p className="text-sm text-green-800">
                              You accepted this quotation. An order has been
                              created.
                            </p>
                          </div>
                        )}

                        {isExpired && quotation.status === "SENT" && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <p className="text-sm text-red-800">
                              This quotation has expired. Please contact the
                              vendor for a new quotation.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
