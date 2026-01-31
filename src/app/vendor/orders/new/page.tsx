"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  Search,
  Package,
} from "lucide-react";
import {
  createQuotation,
  getVendorProducts,
  getVendorCustomers,
  VendorProduct,
  VendorCustomer,
} from "@/actions/vendor";
import { RentalPeriodType } from "@prisma/client";
import { toast } from "sonner";

type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rentalStartDate: string;
  rentalEndDate: string;
  periodType: RentalPeriodType;
  periodDuration: number;
};

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [customers, setCustomers] = useState<VendorCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function fetchData() {
      const [productsRes, customersRes] = await Promise.all([
        getVendorProducts({ limit: 100 }),
        getVendorCustomers({ limit: 100 }),
      ]);

      if (productsRes.success && productsRes.data) {
        setProducts(productsRes.data.products);
      }
      if (customersRes.success && customersRes.data) {
        setCustomers(customersRes.data.customers);
      }
    }
    fetchData();
  }, []);

  const addItem = () => {
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        productId: "",
        productName: "",
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        rentalStartDate: today,
        rentalEndDate: nextWeek,
        periodType: "DAILY",
        periodDuration: 7,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<OrderItem>) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;

        const updatedItem = { ...item, ...updates };

        // If product changed, update price
        if (updates.productId) {
          const product = products.find((p) => p.id === updates.productId);
          if (product) {
            updatedItem.productName = product.name;
            updatedItem.unitPrice = product.basePrice;
            updatedItem.totalPrice =
              product.basePrice *
              updatedItem.quantity *
              updatedItem.periodDuration;
          }
        }

        // Recalculate total if quantity or duration changed
        if (
          updates.quantity !== undefined ||
          updates.periodDuration !== undefined
        ) {
          updatedItem.totalPrice =
            updatedItem.unitPrice *
            (updates.quantity ?? updatedItem.quantity) *
            (updates.periodDuration ?? updatedItem.periodDuration);
        }

        // Calculate period duration from dates
        if (updates.rentalStartDate || updates.rentalEndDate) {
          const start = new Date(updatedItem.rentalStartDate);
          const end = new Date(updatedItem.rentalEndDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          updatedItem.periodDuration = diffDays || 1;
          updatedItem.totalPrice =
            updatedItem.unitPrice *
            updatedItem.quantity *
            updatedItem.periodDuration;
        }

        return updatedItem;
      }),
    );
  };

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = subtotal * 0.18;
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      toast.error("Please select a customer");
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    const invalidItems = items.filter((item) => !item.productId);
    if (invalidItems.length > 0) {
      toast.error("Please select products for all items");
      return;
    }

    setLoading(true);
    try {
      const result = await createQuotation({
        customerId: selectedCustomerId,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          rentalStartDate: new Date(item.rentalStartDate),
          rentalEndDate: new Date(item.rentalEndDate),
          periodType: item.periodType,
          periodDuration: item.periodDuration,
        })),
        notes: notes || undefined,
      });

      if (result.success && result.data) {
        toast.success("Order created successfully");
        router.push(`/vendor/orders`);
      } else {
        toast.error(result.error || "Failed to create order");
      }
    } catch (error) {
      toast.error("Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/vendor/orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Rental Order</h1>
          <p className="text-muted-foreground">Create a new rental quotation</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Select Customer</Label>
                  <Select
                    value={selectedCustomerId}
                    onValueChange={setSelectedCustomerId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.firstName} {customer.lastName} (
                          {customer.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedCustomerId && (
                <div className="p-4 bg-muted rounded-lg">
                  {(() => {
                    const customer = customers.find(
                      (c) => c.id === selectedCustomerId,
                    );
                    return customer ? (
                      <div className="space-y-1">
                        <p className="font-medium">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {customer.email}
                        </p>
                        {customer.phone && (
                          <p className="text-sm text-muted-foreground">
                            {customer.phone}
                          </p>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Order Lines</CardTitle>
              <Button size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No products added</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={addItem}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-4 border rounded-lg space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Item #{index + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Product</Label>
                          <Select
                            value={item.productId}
                            onValueChange={(value) =>
                              updateItem(item.id, { productId: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - ₹{product.basePrice}/day
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(item.id, {
                                quantity: parseInt(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Input
                            type="date"
                            value={item.rentalStartDate}
                            onChange={(e) =>
                              updateItem(item.id, {
                                rentalStartDate: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>End Date</Label>
                          <Input
                            type="date"
                            value={item.rentalEndDate}
                            onChange={(e) =>
                              updateItem(item.id, {
                                rentalEndDate: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Period Type</Label>
                          <Select
                            value={item.periodType}
                            onValueChange={(value) =>
                              updateItem(item.id, {
                                periodType: value as RentalPeriodType,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HOURLY">Hourly</SelectItem>
                              <SelectItem value="DAILY">Daily</SelectItem>
                              <SelectItem value="WEEKLY">Weekly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t">
                        <div className="text-sm text-muted-foreground">
                          {item.periodDuration} days × ₹{item.unitPrice}/day ×{" "}
                          {item.quantity}
                        </div>
                        <div className="font-medium">
                          ₹{item.totalPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full min-h-[100px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Add any notes or special instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
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

        {/* Sidebar - Summary */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span>{items.length}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>₹0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST (18%)</span>
                <span>₹{taxAmount.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{totalAmount.toLocaleString()}</span>
              </div>

              <div className="pt-4 space-y-2">
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Quotation"}
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/vendor/orders">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
