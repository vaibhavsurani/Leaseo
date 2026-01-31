"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ShoppingCart,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getCart,
  updateCartItem,
  removeFromCart,
  validateCoupon,
} from "@/actions/cart";
import { toast } from "sonner";
import { format } from "date-fns";

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rentalStartDate: Date;
  rentalEndDate: Date;
  periodType: string;
  image: string | null;
  securityDeposit: number;
}

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    couponId: string;
  } | null>(null);

  useEffect(() => {
    fetchCart();

    // Also refetch when the window regains focus (user returns from checkout)
    const handleFocus = () => {
      fetchCart();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const fetchCart = async () => {
    try {
      setIsLoading(true);
      const data = await getCart();
      setCartItems(data.items);
    } catch (error) {
      console.error("Error fetching cart:", error);
      toast.error("Failed to load cart");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    startTransition(async () => {
      const result = await updateCartItem(itemId, newQuantity);
      if (result.success) {
        setCartItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  quantity: newQuantity,
                  totalPrice: item.unitPrice * newQuantity,
                }
              : item,
          ),
        );
        toast.success("Cart updated");
      } else {
        toast.error(result.error || "Failed to update cart");
      }
    });
  };

  const handleRemoveItem = (itemId: string) => {
    startTransition(async () => {
      const result = await removeFromCart(itemId);
      if (result.success) {
        setCartItems((prev) => prev.filter((item) => item.id !== itemId));
        toast.success("Item removed from cart");
      } else {
        toast.error(result.error || "Failed to remove item");
      }
    });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const result = await validateCoupon(couponCode, subtotal);

    if (result.success && result.discount !== undefined) {
      setAppliedCoupon({
        code: result.code!,
        discount: result.discount,
        couponId: result.couponId!,
      });
      toast.success(`Coupon applied! You save ₹${result.discount}`);
    } else {
      toast.error(result.error || "Invalid coupon");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast.success("Coupon removed");
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const discount = appliedCoupon?.discount || 0;
  const tax = Math.round((subtotal - discount) * 0.18);
  const securityDeposit = cartItems.reduce(
    (sum, item) => sum + item.securityDeposit * item.quantity,
    0,
  );
  const total = subtotal - discount + tax;

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    router.push(
      `/checkout/address${appliedCoupon ? `?couponId=${appliedCoupon.couponId}&discount=${discount}` : ""}`,
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Continue Shopping
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            Shopping Cart
          </h1>
          <p className="text-muted-foreground mt-2">
            {cartItems.length} items in your cart
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {cartItems.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
              <h2 className="text-xl font-semibold">Your cart is empty</h2>
              <p className="text-muted-foreground">
                Add some products to get started
              </p>
              <Button onClick={() => router.push("/products")}>
                Browse Products
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-muted rounded-md overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3
                              className="font-semibold hover:text-primary cursor-pointer"
                              onClick={() =>
                                router.push(`/products/${item.productSlug}`)
                              }
                            >
                              {item.productName}
                            </h3>
                            {item.variantName && (
                              <p className="text-sm text-muted-foreground">
                                Variant: {item.variantName}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">
                              {format(
                                new Date(item.rentalStartDate),
                                "MMM dd, yyyy",
                              )}{" "}
                              -{" "}
                              {format(
                                new Date(item.rentalEndDate),
                                "MMM dd, yyyy",
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.periodType.charAt(0) +
                                item.periodType.slice(1).toLowerCase()}{" "}
                              rental
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                handleUpdateQuantity(item.id, item.quantity - 1)
                              }
                              disabled={item.quantity <= 1 || isPending}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                handleUpdateQuantity(item.id, item.quantity + 1)
                              }
                              disabled={isPending}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              ₹{item.unitPrice}/day
                            </p>
                            <p className="font-bold text-lg">
                              ₹{item.totalPrice.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Coupon */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Apply Coupon
                    </label>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-green-50 p-3 rounded-md border border-green-200">
                        <div>
                          <p className="font-medium text-green-700">
                            {appliedCoupon.code}
                          </p>
                          <p className="text-sm text-green-600">
                            -₹{appliedCoupon.discount}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveCoupon}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter coupon code"
                          value={couponCode}
                          onChange={(e) =>
                            setCouponCode(e.target.value.toUpperCase())
                          }
                        />
                        <Button variant="outline" onClick={handleApplyCoupon}>
                          Apply
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>₹{subtotal.toLocaleString()}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-₹{discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">GST (18%)</span>
                      <span>₹{tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Security Deposit
                      </span>
                      <span className="text-amber-600">
                        ₹{securityDeposit.toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>₹{total.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      + ₹{securityDeposit.toLocaleString()} refundable security
                      deposit
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" size="lg" onClick={handleCheckout}>
                    Proceed to Checkout
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
