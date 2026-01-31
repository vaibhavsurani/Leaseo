"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import {
  ChevronRight,
  CreditCard,
  Lock,
  Loader2,
  Shield,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCartSummary, CartSummary } from "@/actions/checkout";
import { toast } from "sonner";

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null);
  const [checkoutData, setCheckoutData] = useState<{
    addressId: string;
    deliveryMethod: string;
  } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "failed"
  >("idle");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Get checkout data from sessionStorage
        const storedData = sessionStorage.getItem("checkoutData");
        if (!storedData) {
          toast.error("Please select a delivery address first");
          router.push("/checkout/address");
          return;
        }

        const parsedData = JSON.parse(storedData);
        setCheckoutData(parsedData);

        // Get cart summary
        const cartData = await getCartSummary();
        setCartSummary(cartData);

        if (cartData.items.length === 0) {
          toast.error("Your cart is empty");
          router.push("/cart");
        }
      } catch (error) {
        console.error("Error fetching payment data:", error);
        toast.error("Failed to load payment data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const deliveryCharge =
    checkoutData?.deliveryMethod === "delivery"
      ? 200
      : checkoutData?.deliveryMethod === "scheduled"
        ? 150
        : 0;

  const totalAmount = cartSummary ? cartSummary.total + deliveryCharge : 0;

  const handlePayment = useCallback(async () => {
    if (!checkoutData || !cartSummary || !razorpayLoaded) {
      toast.error("Please wait for the page to load completely");
      return;
    }

    setIsProcessing(true);
    setPaymentStatus("processing");

    try {
      // Step 1: Create Razorpay order
      const orderResponse = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmount,
          type: "checkout",
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.error || "Failed to create payment order");
      }

      // Step 2: Open Razorpay checkout
      const options: RazorpayOptions = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "RentIt",
        description: "Rental Order Payment",
        order_id: orderData.orderId,
        handler: async function (response: RazorpayResponse) {
          try {
            // Step 3: Verify payment
            const verifyResponse = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                addressId: checkoutData.addressId,
                deliveryMethod: checkoutData.deliveryMethod,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData.error || "Payment verification failed",
              );
            }

            // Payment successful
            setPaymentStatus("success");
            toast.success("Payment successful!");

            // Store order ID for confirmation page
            sessionStorage.setItem("lastOrderId", verifyData.orderId);
            sessionStorage.removeItem("checkoutData");

            // Redirect to confirmation
            router.push("/checkout/confirmation");
          } catch (error) {
            console.error("Payment verification error:", error);
            setPaymentStatus("failed");
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: "",
          email: "",
          contact: "",
        },
        theme: {
          color: "#6366f1",
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setPaymentStatus("idle");
            toast.info("Payment cancelled");
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);
      setIsProcessing(false);
      setPaymentStatus("failed");
      toast.error(error instanceof Error ? error.message : "Payment failed");
    }
  }, [checkoutData, cartSummary, razorpayLoaded, totalAmount, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading payment options...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Razorpay Script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
        onError={() => toast.error("Failed to load payment gateway")}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <span>Cart</span>
              <ChevronRight className="h-4 w-4" />
              <span>Address</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground font-medium">Payment</span>
              <ChevronRight className="h-4 w-4" />
              <span>Confirmation</span>
            </div>
            <h1 className="text-2xl font-bold">Payment</h1>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Payment Section */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Secure Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Payment Status */}
                  {paymentStatus === "success" && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">
                          Payment Successful!
                        </p>
                        <p className="text-sm text-green-600">
                          Redirecting to confirmation...
                        </p>
                      </div>
                    </div>
                  )}

                  {paymentStatus === "failed" && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-800">
                          Payment Failed
                        </p>
                        <p className="text-sm text-red-600">
                          Please try again or contact support.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Razorpay Payment Info */}
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="font-medium text-blue-800 mb-2">
                        Secure Online Payment
                      </h3>
                      <p className="text-sm text-blue-600">
                        Click the button below to securely pay using Razorpay.
                        You can pay using:
                      </p>
                      <ul className="mt-2 text-sm text-blue-600 list-disc list-inside space-y-1">
                        <li>Credit/Debit Cards (Visa, Mastercard, Rupay)</li>
                        <li>UPI (Google Pay, PhonePe, Paytm)</li>
                        <li>Net Banking (All major banks)</li>
                        <li>Wallets (Paytm, PhonePe, Amazon Pay)</li>
                      </ul>
                    </div>

                    {/* Security Badge */}
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                      <Shield className="h-10 w-10 text-green-600" />
                      <div>
                        <p className="font-medium">100% Secure Payment</p>
                        <p className="text-sm text-muted-foreground">
                          All transactions are encrypted with 256-bit SSL
                          encryption
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t">
                    <Lock className="h-4 w-4" />
                    <span>
                      Your payment information is secure and encrypted
                    </span>
                  </div>

                  {/* Pay Button */}
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    disabled={
                      isProcessing ||
                      !razorpayLoaded ||
                      paymentStatus === "success"
                    }
                    onClick={handlePayment}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : !razorpayLoaded ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading Payment Gateway...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay ₹{totalAmount.toLocaleString()}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Back Button */}
              <Button
                variant="outline"
                onClick={() => router.push("/checkout/address")}
                disabled={isProcessing}
              >
                Back to Address
              </Button>
            </div>

            {/* Order Summary Sidebar */}
            {cartSummary && (
              <div className="lg:col-span-1">
                <Card className="sticky top-4">
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Items */}
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {cartSummary.items.map((item) => (
                        <div key={item.id} className="flex gap-3">
                          <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden shrink-0">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.productName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                No img
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {item.productName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm font-semibold">
                            ₹{item.totalPrice.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>₹{cartSummary.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Tax (18% GST)
                        </span>
                        <span>₹{cartSummary.taxAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Security Deposit
                        </span>
                        <span>
                          ₹{cartSummary.securityDeposit.toLocaleString()}
                        </span>
                      </div>
                      {deliveryCharge > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Delivery
                          </span>
                          <span>₹{deliveryCharge}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t">
                        <span>Total</span>
                        <span className="text-primary">
                          ₹{totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
