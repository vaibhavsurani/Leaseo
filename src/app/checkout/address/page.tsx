"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, MapPin, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCheckoutAddresses,
  addCheckoutAddress,
  getCartSummary,
  saveCheckoutSelection,
  CheckoutAddress,
  CartSummary,
} from "@/actions/checkout";
import { toast } from "sonner";

export default function CheckoutAddressPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [addresses, setAddresses] = useState<CheckoutAddress[]>([]);
  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null);

  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const [deliveryMethod, setDeliveryMethod] = useState<
    "pickup" | "delivery" | "scheduled"
  >("delivery");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [addressesData, cartData] = await Promise.all([
          getCheckoutAddresses(),
          getCartSummary(),
        ]);

        setAddresses(addressesData);
        setCartSummary(cartData);

        // Select default address or first one
        const defaultAddress = addressesData.find((a) => a.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        } else if (addressesData.length > 0) {
          setSelectedAddressId(addressesData[0].id);
        }

        // Check if cart is empty
        if (cartData.items.length === 0) {
          toast.error("Your cart is empty");
          router.push("/cart");
        }
      } catch (error) {
        console.error("Error fetching checkout data:", error);
        toast.error("Failed to load checkout data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleAddAddress = () => {
    if (
      !newAddress.label ||
      !newAddress.addressLine1 ||
      !newAddress.city ||
      !newAddress.state ||
      !newAddress.postalCode
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    startTransition(async () => {
      const result = await addCheckoutAddress({
        label: newAddress.label,
        addressLine1: newAddress.addressLine1,
        city: newAddress.city,
        state: newAddress.state,
        postalCode: newAddress.postalCode,
        isDefault: addresses.length === 0,
      });

      if (result.success && result.address) {
        setAddresses([...addresses, result.address]);
        setSelectedAddressId(result.address.id);
        setIsAddingNew(false);
        setNewAddress({
          label: "",
          addressLine1: "",
          city: "",
          state: "",
          postalCode: "",
        });
        toast.success("Address added successfully");
      } else {
        toast.error(result.error || "Failed to add address");
      }
    });
  };

  const handleContinue = () => {
    if (!selectedAddressId) {
      toast.error("Please select a delivery address");
      return;
    }

    startTransition(async () => {
      const result = await saveCheckoutSelection({
        addressId: selectedAddressId,
        deliveryMethod,
      });

      if (result.success) {
        // Store selection in sessionStorage for the payment page
        sessionStorage.setItem(
          "checkoutData",
          JSON.stringify({
            addressId: selectedAddressId,
            deliveryMethod,
          }),
        );
        router.push("/checkout/payment");
      } else {
        toast.error(result.error || "Failed to save selection");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <span>Cart</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Address</span>
            <ChevronRight className="h-4 w-4" />
            <span>Payment</span>
            <ChevronRight className="h-4 w-4" />
            <span>Confirmation</span>
          </div>
          <h1 className="text-2xl font-bold">Delivery Details</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Addresses Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Select Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Saved Addresses */}
                {addresses.length > 0 ? (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        onClick={() => setSelectedAddressId(address.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedAddressId === address.id
                            ? "border-primary bg-primary/5"
                            : "border-input hover:border-primary/50"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                                selectedAddressId === address.id
                                  ? "border-primary bg-primary"
                                  : "border-input"
                              }`}
                            >
                              {selectedAddressId === address.id && (
                                <div className="h-2 w-2 bg-white rounded-full" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold">
                                {address.label || "Address"}
                              </h3>
                            </div>
                          </div>
                          {address.isDefault && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm ml-8">
                          {address.addressLine1}
                          {address.addressLine2 &&
                            `, ${address.addressLine2}`}, {address.city},{" "}
                          {address.state} {address.postalCode}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No saved addresses found</p>
                    <p className="text-sm">Add a new address to continue</p>
                  </div>
                )}

                {/* Add New Address */}
                {!isAddingNew ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsAddingNew(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Address
                  </Button>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="pt-6 space-y-4">
                      <div>
                        <Label>Address Label</Label>
                        <Input
                          placeholder="e.g., Home, Office"
                          value={newAddress.label}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              label: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label>Street Address</Label>
                        <Input
                          placeholder="Building, street, apartment no."
                          value={newAddress.addressLine1}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              addressLine1: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>City</Label>
                          <Input
                            placeholder="City"
                            value={newAddress.city}
                            onChange={(e) =>
                              setNewAddress({
                                ...newAddress,
                                city: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>State</Label>
                          <Input
                            placeholder="State"
                            value={newAddress.state}
                            onChange={(e) =>
                              setNewAddress({
                                ...newAddress,
                                state: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>PIN Code</Label>
                          <Input
                            placeholder="PIN Code"
                            value={newAddress.postalCode}
                            onChange={(e) =>
                              setNewAddress({
                                ...newAddress,
                                postalCode: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={handleAddAddress}
                          disabled={
                            isPending ||
                            !newAddress.label ||
                            !newAddress.addressLine1 ||
                            !newAddress.city ||
                            !newAddress.state ||
                            !newAddress.postalCode
                          }
                        >
                          {isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Address"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setIsAddingNew(false)}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Delivery Method */}
            <Card>
              <CardHeader>
                <CardTitle>Select Delivery Method</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={deliveryMethod}
                  onValueChange={(value: any) => setDeliveryMethod(value)}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="pickup">Pick Up</TabsTrigger>
                    <TabsTrigger value="delivery">Delivery</TabsTrigger>
                    <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                  </TabsList>

                  <TabsContent value="pickup" className="space-y-4 mt-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                      <p className="font-semibold text-blue-900">
                        Free Pick Up
                      </p>
                      <p className="text-sm text-blue-800">
                        Pick up your rental from our nearest location
                      </p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>📍 Mumbai Warehouse</p>
                        <p>123 Business District, Bandra, Mumbai</p>
                        <p>Available: 9 AM - 6 PM (Mon-Sat)</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="delivery" className="space-y-4 mt-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-green-900">
                            Door Delivery
                          </p>
                          <p className="text-sm text-green-800">
                            Delivered to your address by our team
                          </p>
                        </div>
                        <span className="font-bold text-green-700">₹200</span>
                      </div>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>✓ Same day delivery available</p>
                        <p>✓ Setup included</p>
                        <p>✓ 2-4 hour delivery window</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="scheduled" className="space-y-4 mt-4">
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-purple-900">
                            Scheduled Delivery
                          </p>
                          <p className="text-sm text-purple-800">
                            Choose your preferred date and time
                          </p>
                        </div>
                        <span className="font-bold text-purple-700">₹150</span>
                      </div>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>✓ Schedule up to 30 days in advance</p>
                        <p>✓ Professional installation</p>
                        <p>✓ Same hour delivery slot</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          {cartSummary && cartSummary.items.length > 0 && (
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Items */}
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {cartSummary.items.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden shrink-0">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {item.productName}
                          </p>
                          {item.variantName && (
                            <p className="text-xs text-muted-foreground">
                              {item.variantName}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Qty: {item.quantity}
                          </p>
                          <p className="text-sm font-semibold">
                            ₹{item.totalPrice.toLocaleString()}
                          </p>
                        </div>
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
                    {deliveryMethod === "delivery" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery</span>
                        <span>₹200</span>
                      </div>
                    )}
                    {deliveryMethod === "scheduled" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Scheduled Delivery
                        </span>
                        <span>₹150</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total</span>
                      <span className="text-primary">
                        ₹
                        {(
                          cartSummary.total +
                          (deliveryMethod === "delivery"
                            ? 200
                            : deliveryMethod === "scheduled"
                              ? 150
                              : 0)
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-8 max-w-2xl mx-auto lg:max-w-none lg:px-0">
          <Button
            variant="outline"
            className="flex-1 lg:flex-none"
            onClick={() => router.push("/cart")}
          >
            Back to Cart
          </Button>
          <Button
            className="flex-1 lg:flex-none"
            size="lg"
            onClick={handleContinue}
            disabled={isPending || !selectedAddressId}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue to Payment
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
