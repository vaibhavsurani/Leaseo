"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  ShoppingCart,
  Truck,
  Shield,
  Package,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getProductBySlug } from "@/actions/products";
import { addToCart } from "@/actions/cart";
import {
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
} from "@/actions/wishlist";
import { toast } from "sonner";
import ProductAvailabilityCalendar from "@/components/ProductAvailabilityCalendar";

interface ProductVariantAttribute {
  id: string;
  attributeName: string;
  attributeId: string;
  valueId: string;
  value: string;
}

interface ProductVariant {
  id: string;
  name: string | null;
  priceModifier: number;
  sku: string;
  quantity: number;
  isActive: boolean;
  attributes: ProductVariantAttribute[];
}

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

interface RentalPricing {
  id: string;
  periodType: string;
  duration: number;
  price: number;
}

interface ProductData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  basePrice: number;
  securityDeposit: number;
  quantity: number;
  isRentable: boolean;
  isPublished: boolean;
  minRentalPeriod: number;
  maxRentalPeriod: number | null;
  images: ProductImage[];
  variants: ProductVariant[];
  rentalPricing: RentalPricing[];
  category: { id: string; name: string; slug: string } | null;
  vendor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
  };
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [isInWishlistState, setIsInWishlistState] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [rentalPeriod, setRentalPeriod] = useState<
    "HOURLY" | "DAILY" | "WEEKLY"
  >("DAILY");
  const [rentalDuration, setRentalDuration] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<
    Record<string, string>
  >({});

  // Get unique attributes from all variants
  const productAttributes = useMemo(() => {
    if (!product?.variants?.length) return [];

    const attributeMap = new Map<
      string,
      { id: string; name: string; values: Array<{ id: string; value: string }> }
    >();

    product.variants.forEach((variant) => {
      variant.attributes.forEach((attr) => {
        if (!attributeMap.has(attr.attributeId)) {
          attributeMap.set(attr.attributeId, {
            id: attr.attributeId,
            name: attr.attributeName,
            values: [],
          });
        }

        const existing = attributeMap.get(attr.attributeId)!;
        if (!existing.values.find((v) => v.id === attr.valueId)) {
          existing.values.push({ id: attr.valueId, value: attr.value });
        }
      });
    });

    return Array.from(attributeMap.values());
  }, [product?.variants]);

  // Check if product has variants with attributes
  const hasVariantAttributes = useMemo(() => {
    return (
      product?.variants?.some((v) => v.attributes && v.attributes.length > 0) ||
      false
    );
  }, [product?.variants]);

  // Find matching variant based on selected attribute values
  const matchingVariant = useMemo(() => {
    if (!product?.variants?.length || !hasVariantAttributes) return null;

    const selectedValueIds = Object.values(selectedAttributeValues);
    if (selectedValueIds.length !== productAttributes.length) return null;

    return product.variants.find((variant) => {
      const variantValueIds = variant.attributes.map((a) => a.valueId);
      return selectedValueIds.every((valueId) =>
        variantValueIds.includes(valueId),
      );
    });
  }, [
    product?.variants,
    selectedAttributeValues,
    productAttributes.length,
    hasVariantAttributes,
  ]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        const [productData, wishlistStatus] = await Promise.all([
          getProductBySlug(slug),
          isInWishlist(slug),
        ]);

        if (productData) {
          setProduct(productData);
          setIsInWishlistState(wishlistStatus);
          if (productData.variants.length > 0) {
            setSelectedVariant(productData.variants[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Failed to load product");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  // Get price based on rental period type
  const getPriceForPeriod = (
    periodType: "HOURLY" | "DAILY" | "WEEKLY",
  ): number => {
    if (!product) return 0;
    const pricing = product.rentalPricing.find(
      (p) => p.periodType === periodType,
    );
    return pricing ? pricing.price : product.basePrice;
  };

  const calculateTotal = () => {
    if (!product) return 0;

    const basePrice = getPriceForPeriod(rentalPeriod);

    const variantPrice = selectedVariant
      ? product.variants.find((v) => v.id === selectedVariant)?.priceModifier ||
        0
      : 0;

    return (basePrice + variantPrice) * rentalDuration * quantity;
  };

  const handleAddToCartClick = () => {
    if (!product) return;

    // If product has variants with attributes and no variant is selected, open dialog
    if (hasVariantAttributes && !matchingVariant && !selectedVariant) {
      setVariantDialogOpen(true);
      return;
    }

    handleAddToCart();
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (!startDate) {
      toast.error("Please select a start date");
      return;
    }

    const variantToUse = matchingVariant?.id || selectedVariant || undefined;

    startTransition(async () => {
      const result = await addToCart({
        productId: product.id,
        variantId: variantToUse,
        quantity,
        rentalStartDate: new Date(startDate),
        rentalEndDate: new Date(
          new Date(startDate).getTime() + rentalDuration * 24 * 60 * 60 * 1000,
        ),
        periodType: rentalPeriod,
      });

      if (result.success) {
        toast.success("Added to cart");
        setVariantDialogOpen(false);
        router.push("/cart");
      } else {
        toast.error(result.error || "Failed to add to cart");
      }
    });
  };

  const handleVariantDialogConfirm = () => {
    if (!matchingVariant && hasVariantAttributes) {
      toast.error("Please select all variant options");
      return;
    }
    handleAddToCart();
  };

  const handleWishlistToggle = () => {
    if (!product) return;

    startTransition(async () => {
      if (isInWishlistState) {
        const result = await removeFromWishlist(product.id);
        if (result.success) {
          setIsInWishlistState(false);
          toast.success("Removed from wishlist");
        } else {
          toast.error(result.error || "Failed to remove from wishlist");
        }
      } else {
        const result = await addToWishlist(product.id);
        if (result.success) {
          setIsInWishlistState(true);
          toast.success("Added to wishlist");
        } else {
          toast.error(result.error || "Failed to add to wishlist");
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Product Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The product you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button onClick={() => router.push("/products")}>
              Browse Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPrice = getPriceForPeriod(rentalPeriod);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-40 bg-background">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
              {product.images.length > 0 ? (
                <img
                  src={
                    product.images[selectedImageIndex]?.url ||
                    "/api/placeholder/600/600"
                  }
                  alt={product.images[selectedImageIndex]?.alt || product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-muted-foreground opacity-50" />
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={`absolute top-4 right-4 rounded-full bg-white/80 hover:bg-white ${
                  isInWishlistState ? "text-red-500" : ""
                }`}
                onClick={handleWishlistToggle}
                disabled={isPending}
              >
                <Heart
                  className={`h-5 w-5 ${isInWishlistState ? "fill-current" : ""}`}
                />
              </Button>
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image, idx) => (
                  <button
                    key={idx}
                    className={`aspect-square bg-muted rounded-lg overflow-hidden border-2 ${
                      selectedImageIndex === idx
                        ? "border-primary"
                        : "border-transparent hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedImageIndex(idx)}
                  >
                    <img
                      src={image.url}
                      alt={image.alt || product.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              {product.category && (
                <p className="text-sm text-muted-foreground mb-1">
                  {product.category.name}
                </p>
              )}
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              {product.description && (
                <p className="text-muted-foreground">{product.description}</p>
              )}
            </div>

            {/* Price */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {rentalPeriod === "HOURLY"
                        ? "Hourly"
                        : rentalPeriod === "WEEKLY"
                          ? "Weekly"
                          : "Daily"}{" "}
                      Rental Price
                    </div>
                    <div className="text-4xl font-bold text-primary">
                      ₹{currentPrice}
                      <span className="text-lg text-muted-foreground">
                        /
                        {rentalPeriod === "HOURLY"
                          ? "hour"
                          : rentalPeriod === "WEEKLY"
                            ? "week"
                            : "day"}
                      </span>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Security Deposit
                    </div>
                    <div className="text-2xl font-semibold">
                      ₹{product.securityDeposit}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configure Your Rental</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Variant Selection */}
                {product.variants.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Select Package
                    </label>
                    <Select
                      value={selectedVariant}
                      onValueChange={setSelectedVariant}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a package" />
                      </SelectTrigger>
                      <SelectContent>
                        {product.variants.map((variant) => (
                          <SelectItem key={variant.id} value={variant.id}>
                            {variant.name}
                            {variant.priceModifier > 0 && (
                              <span className="text-muted-foreground ml-2">
                                +₹{variant.priceModifier}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Rental Period */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rental Period</label>
                    <Select
                      value={rentalPeriod}
                      onValueChange={(value: "HOURLY" | "DAILY" | "WEEKLY") =>
                        setRentalPeriod(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {product.rentalPricing.some(
                          (p) => p.periodType === "HOURLY",
                        ) && <SelectItem value="HOURLY">Hourly</SelectItem>}
                        <SelectItem value="DAILY">Daily</SelectItem>
                        {product.rentalPricing.some(
                          (p) => p.periodType === "WEEKLY",
                        ) && <SelectItem value="WEEKLY">Weekly</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duration</label>
                    <Input
                      type="number"
                      min={product.minRentalPeriod}
                      max={product.maxRentalPeriod || undefined}
                      value={rentalDuration}
                      onChange={(e) =>
                        setRentalDuration(Number(e.target.value))
                      }
                    />
                  </div>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    max={product.quantity}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {product.quantity} units available
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Availability Calendar */}
            <ProductAvailabilityCalendar
              productId={product.id}
              totalQuantity={product.quantity}
              selectedDate={startDate ? new Date(startDate) : undefined}
              onDateSelect={(date) => {
                if (date) {
                  setStartDate(date.toISOString().split("T")[0]);
                }
              }}
            />

            {/* Total Price */}
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">
                    Total Rental Cost
                  </span>
                  <span className="text-3xl font-bold text-primary">
                    ₹{calculateTotal().toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Add to Cart Button */}
            <Button
              size="lg"
              className="w-full"
              onClick={handleAddToCartClick}
              disabled={isPending || !startDate}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {isPending ? "Adding..." : "Add to Cart"}
            </Button>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-3 items-start">
                    <Truck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">Free Delivery</div>
                      <div className="text-xs text-muted-foreground">
                        Pickup and drop available
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-3 items-start">
                    <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">
                        Protected Rental
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Damage coverage included
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-12">
          <Tabs defaultValue="features" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="features" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  {product.shortDescription || product.description ? (
                    <div className="space-y-4">
                      {product.shortDescription && (
                        <p className="text-muted-foreground">
                          {product.shortDescription}
                        </p>
                      )}
                      {product.description && (
                        <p className="text-muted-foreground">
                          {product.description}
                        </p>
                      )}
                      {product.rentalPricing.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-semibold mb-3">
                            Rental Pricing Options
                          </h4>
                          <ul className="space-y-2">
                            {product.rentalPricing.map((pricing) => (
                              <li
                                key={pricing.id}
                                className="flex justify-between items-center"
                              >
                                <span className="capitalize">
                                  {pricing.periodType.toLowerCase()} (
                                  {pricing.duration}{" "}
                                  {pricing.periodType === "HOURLY"
                                    ? "hour"
                                    : pricing.periodType === "DAILY"
                                      ? "day"
                                      : "week"}
                                  {pricing.duration > 1 ? "s" : ""})
                                </span>
                                <span className="font-semibold text-primary">
                                  ₹{pricing.price}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No additional details available for this product.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <dl className="space-y-4">
                    <div>
                      <dt className="font-semibold text-sm">Minimum Rental</dt>
                      <dd className="text-muted-foreground">
                        {product.minRentalPeriod} day
                        {product.minRentalPeriod > 1 ? "s" : ""}
                      </dd>
                    </div>
                    {product.maxRentalPeriod && (
                      <div>
                        <dt className="font-semibold text-sm">
                          Maximum Rental
                        </dt>
                        <dd className="text-muted-foreground">
                          {product.maxRentalPeriod} days
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="font-semibold text-sm">Availability</dt>
                      <dd className="text-muted-foreground">
                        {product.quantity} units available
                      </dd>
                    </div>
                    {product.vendor && (
                      <div>
                        <dt className="font-semibold text-sm">Vendor</dt>
                        <dd className="text-muted-foreground">
                          {product.vendor.companyName ||
                            [product.vendor.firstName, product.vendor.lastName]
                              .filter(Boolean)
                              .join(" ") ||
                            "N/A"}
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Variant Selection Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Your Product</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Product Preview */}
            <div className="flex gap-4 items-start border-b pb-4">
              {product?.images?.[0] && (
                <img
                  src={product.images[0].url}
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{product?.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Base Price: ₹{product?.basePrice}
                  {rentalPeriod === "HOURLY"
                    ? "/hour"
                    : rentalPeriod === "WEEKLY"
                      ? "/week"
                      : "/day"}
                </p>
              </div>
            </div>

            {/* Attribute Selections */}
            {productAttributes.map((attribute) => (
              <div key={attribute.id} className="space-y-3">
                <Label className="text-sm font-medium">{attribute.name}</Label>
                <RadioGroup
                  value={selectedAttributeValues[attribute.id] || ""}
                  onValueChange={(value) =>
                    setSelectedAttributeValues((prev) => ({
                      ...prev,
                      [attribute.id]: value,
                    }))
                  }
                  className="grid grid-cols-2 gap-2"
                >
                  {attribute.values.map((attrValue) => (
                    <div
                      key={attrValue.id}
                      className="flex items-center space-x-2"
                    >
                      <RadioGroupItem value={attrValue.id} id={attrValue.id} />
                      <Label htmlFor={attrValue.id} className="cursor-pointer">
                        {attrValue.value}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}

            {/* Selected Variant Info */}
            {matchingVariant && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <Check className="h-4 w-4" />
                  <span className="font-medium">Selected Variant</span>
                </div>
                <p className="text-sm">{matchingVariant.name || "Variant"}</p>
                {matchingVariant.priceModifier !== 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Price modifier:{" "}
                    {matchingVariant.priceModifier > 0 ? "+" : ""}₹
                    {matchingVariant.priceModifier}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {matchingVariant.quantity} units available
                </p>
              </div>
            )}

            {/* Selected Values Summary */}
            {Object.keys(selectedAttributeValues).length > 0 &&
              !matchingVariant && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">
                    Selected:
                  </span>
                  {productAttributes.map((attr) => {
                    const valueId = selectedAttributeValues[attr.id];
                    const value = attr.values.find((v) => v.id === valueId);
                    if (!value) return null;
                    return (
                      <Badge key={attr.id} variant="secondary">
                        {attr.name}: {value.value}
                      </Badge>
                    );
                  })}
                </div>
              )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVariantDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVariantDialogConfirm}
              disabled={!matchingVariant || isPending}
            >
              {isPending ? "Adding..." : "Confirm & Add to Cart"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
