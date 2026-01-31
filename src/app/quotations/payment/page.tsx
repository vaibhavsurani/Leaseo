"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ChevronRight,
  CreditCard,
  Smartphone,
  Wallet,
  Lock,
  Loader2,
  Building,
  FileText,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCustomerQuotationById, CustomerQuotation } from "@/actions/orders";
import { processQuotationPayment } from "@/actions/checkout";
import { toast } from "sonner";
import { format } from "date-fns";

type PaymentMethod = "card" | "upi" | "wallet" | "netbanking";

export default function QuotationPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationId = searchParams.get("id");

  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [quotation, setQuotation] = useState<CustomerQuotation | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");

  const [cardData, setCardData] = useState({
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    cvv: "",
  });

  const [upiData, setUpiData] = useState({
    upiId: "",
  });

  useEffect(() => {
    const fetchQuotation = async () => {
      if (!quotationId) {
        toast.error("No quotation specified");
        router.push("/quotations");
        return;
      }

      try {
        setIsLoading(true);
        const data = await getCustomerQuotationById(quotationId);

        if (!data) {
          toast.error("Quotation not found");
          router.push("/quotations");
          return;
        }

        if (data.status !== "SENT") {
          toast.error("This quotation cannot be paid for");
          router.push("/quotations");
          return;
        }

        setQuotation(data);
      } catch (error) {
        console.error("Error fetching quotation:", error);
        toast.error("Failed to load quotation");
        router.push("/quotations");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuotation();
  }, [quotationId, router]);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!quotation) return;

    if (paymentMethod === "card") {
      if (
        !cardData.cardNumber ||
        !cardData.cardHolder ||
        !cardData.expiryDate ||
        !cardData.cvv
      ) {
        toast.error("Please fill in all card details");
        return;
      }
      setShowOtpModal(true);
      return;
    }

    if (paymentMethod === "upi") {
      if (!upiData.upiId) {
        toast.error("Please enter your UPI ID");
        return;
      }
    }

    processPaymentAction();
  };

  const processPaymentAction = () => {
    if (!quotation) return;

    startTransition(async () => {
      const result = await processQuotationPayment({
        quotationId: quotation.id,
        paymentMethod,
      });

      if (result.success) {
        toast.success("Payment successful! Order created.");
        router.push(`/orders/${result.orderId}`);
      } else {
        toast.error(result.error || "Payment processing failed");
      }
    });
  };

  const handleOtpSubmit = () => {
    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }
    setShowOtpModal(false);
    processPaymentAction();
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s/g, "").replace(/\D/g, "");
    if (value.length > 16) value = value.slice(0, 16);
    value = value.replace(/(\d{4})/g, "$1 ").trim();
    setCardData({ ...cardData, cardNumber: value });
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 2) {
      value = value.slice(0, 2) + "/" + value.slice(2);
    }
    setCardData({ ...cardData, expiryDate: value });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading quotation details...</p>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <span>Quotations</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Payment</span>
          </div>
          <h1 className="text-2xl font-bold">Pay for Quotation</h1>
          <p className="text-muted-foreground mt-1">
            {quotation.quotationNumber}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quotation Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Quotation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium">{quotation.quotationNumber}</p>
                    <p className="text-sm text-gray-600">
                      From:{" "}
                      {quotation.vendor.companyName ||
                        `${quotation.vendor.firstName || ""} ${quotation.vendor.lastName || ""}`.trim()}
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    Pending Payment
                  </Badge>
                </div>

                {/* Items Preview */}
                <div className="space-y-3">
                  {quotation.items.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                        {item.productImage ? (
                          <Image
                            src={item.productImage}
                            alt={item.productName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.productName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(item.rentalStartDate), "MMM dd")} -{" "}
                          {format(new Date(item.rentalEndDate), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <p className="font-medium">
                        ₹{item.totalPrice.toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {quotation.items.length > 2 && (
                    <p className="text-sm text-gray-500 text-center">
                      +{quotation.items.length - 2} more item(s)
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  {/* Payment Method Selection */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`p-4 border rounded-lg text-center transition-all ${
                        paymentMethod === "card"
                          ? "border-primary bg-primary/5 ring-2 ring-primary"
                          : "hover:border-gray-300"
                      }`}
                    >
                      <CreditCard className="h-6 w-6 mx-auto mb-2" />
                      <span className="text-sm font-medium">Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("upi")}
                      className={`p-4 border rounded-lg text-center transition-all ${
                        paymentMethod === "upi"
                          ? "border-primary bg-primary/5 ring-2 ring-primary"
                          : "hover:border-gray-300"
                      }`}
                    >
                      <Smartphone className="h-6 w-6 mx-auto mb-2" />
                      <span className="text-sm font-medium">UPI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("wallet")}
                      className={`p-4 border rounded-lg text-center transition-all ${
                        paymentMethod === "wallet"
                          ? "border-primary bg-primary/5 ring-2 ring-primary"
                          : "hover:border-gray-300"
                      }`}
                    >
                      <Wallet className="h-6 w-6 mx-auto mb-2" />
                      <span className="text-sm font-medium">Wallet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("netbanking")}
                      className={`p-4 border rounded-lg text-center transition-all ${
                        paymentMethod === "netbanking"
                          ? "border-primary bg-primary/5 ring-2 ring-primary"
                          : "hover:border-gray-300"
                      }`}
                    >
                      <Building className="h-6 w-6 mx-auto mb-2" />
                      <span className="text-sm font-medium">Net Banking</span>
                    </button>
                  </div>

                  {/* Card Payment Form */}
                  {paymentMethod === "card" && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input
                          id="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          value={cardData.cardNumber}
                          onChange={handleCardNumberChange}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cardHolder">Card Holder Name</Label>
                        <Input
                          id="cardHolder"
                          placeholder="John Doe"
                          value={cardData.cardHolder}
                          onChange={(e) =>
                            setCardData({
                              ...cardData,
                              cardHolder: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="expiry">Expiry Date</Label>
                          <Input
                            id="expiry"
                            placeholder="MM/YY"
                            value={cardData.expiryDate}
                            onChange={handleExpiryChange}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cvv">CVV</Label>
                          <Input
                            id="cvv"
                            type="password"
                            placeholder="•••"
                            maxLength={4}
                            value={cardData.cvv}
                            onChange={(e) =>
                              setCardData({
                                ...cardData,
                                cvv: e.target.value.replace(/\D/g, ""),
                              })
                            }
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* UPI Payment Form */}
                  {paymentMethod === "upi" && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label htmlFor="upiId">UPI ID</Label>
                        <Input
                          id="upiId"
                          placeholder="yourname@upi"
                          value={upiData.upiId}
                          onChange={(e) =>
                            setUpiData({ upiId: e.target.value })
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* Wallet Payment */}
                  {paymentMethod === "wallet" && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        You will be redirected to complete payment via your
                        wallet.
                      </p>
                    </div>
                  )}

                  {/* Net Banking */}
                  {paymentMethod === "netbanking" && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        You will be redirected to your bank's website to
                        complete the payment.
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Pay ₹{quotation.totalAmount.toLocaleString()}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Items ({quotation.items.length})
                    </span>
                    <span>₹{quotation.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax (18% GST)</span>
                    <span>₹{quotation.taxAmount.toLocaleString()}</span>
                  </div>
                  {quotation.securityDeposit > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Security Deposit
                      </span>
                      <span>₹{quotation.securityDeposit.toLocaleString()}</span>
                    </div>
                  )}
                  {quotation.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-₹{quotation.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>₹{quotation.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Security Info */}
                <div className="mt-6 p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm font-medium">Secure Payment</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Your payment information is encrypted and secure.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* OTP Modal */}
      <Dialog open={showOtpModal} onOpenChange={setShowOtpModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter OTP</DialogTitle>
            <DialogDescription>
              We've sent a 6-digit OTP to your registered mobile number for
              verification.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="text-center text-2xl tracking-widest"
              maxLength={6}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOtpModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleOtpSubmit} disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Verify & Pay"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
