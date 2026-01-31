"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ShoppingCart, ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getWishlist, removeFromWishlist } from "@/actions/wishlist";
import { toast } from "sonner";

interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  basePrice: number;
  image: string | null;
  rating: number;
  reviews: number;
  inStock: boolean;
  addedAt: Date;
}

export default function WishlistPage() {
  const router = useRouter();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      setIsLoading(true);
      const data = await getWishlist();
      setWishlistItems(data);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      toast.error("Failed to load wishlist");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromWishlist = (id: string) => {
    startTransition(async () => {
      const result = await removeFromWishlist(id);
      if (result.success) {
        setWishlistItems((prev) => prev.filter((item) => item.id !== id));
        toast.success("Removed from wishlist");
      } else {
        toast.error(result.error || "Failed to remove from wishlist");
      }
    });
  };

  const handleAddToCart = (slug: string) => {
    router.push(`/products/${slug}?action=add-to-cart`);
  };

  const handleViewProduct = (slug: string) => {
    router.push(`/products/${slug}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading wishlist...</p>
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
            <Heart className="h-8 w-8 text-red-500 fill-red-500" />
            My Wishlist
          </h1>
          <p className="text-muted-foreground mt-2">
            {wishlistItems.length} items in your wishlist
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {wishlistItems.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
              <h2 className="text-xl font-semibold">Your wishlist is empty</h2>
              <p className="text-muted-foreground">
                Add items to your wishlist to save them for later
              </p>
              <Button onClick={() => router.push("/products")}>
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Image */}
                <div className="relative h-48 bg-gray-200 overflow-hidden group">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => handleViewProduct(item.slug)}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-muted-foreground cursor-pointer"
                      onClick={() => handleViewProduct(item.slug)}
                    >
                      No Image
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-white hover:bg-red-50"
                      onClick={() => handleRemoveFromWishlist(item.id)}
                      disabled={isPending}
                    >
                      <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                    </Button>
                  </div>

                  {/* Stock Badge */}
                  {!item.inStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <CardContent className="p-4 space-y-3">
                  {/* Title */}
                  <h3
                    className="font-semibold line-clamp-2 hover:text-primary cursor-pointer"
                    onClick={() => handleViewProduct(item.slug)}
                  >
                    {item.name}
                  </h3>

                  {/* Rating */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⭐ {item.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">
                      ({item.reviews} reviews)
                    </span>
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-primary">
                      ₹{item.basePrice.toLocaleString()}/day
                    </div>
                    <p className="text-xs text-muted-foreground">
                      or flexible rental periods
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleViewProduct(item.slug)}
                      className="w-full"
                    >
                      View Details
                    </Button>
                    <Button
                      onClick={() => handleAddToCart(item.slug)}
                      disabled={!item.inStock}
                      className="w-full"
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground italic">
                    Click "Add" to move to cart
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Info */}
      {wishlistItems.length > 0 && (
        <div className="border-t bg-gray-50 py-4">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {wishlistItems.length} items •
              <span className="font-semibold ml-1">
                Avg: ₹
                {Math.round(
                  wishlistItems.reduce((sum, item) => sum + item.basePrice, 0) /
                    wishlistItems.length,
                ).toLocaleString()}
                /day
              </span>
            </p>
            <Button onClick={() => router.push("/products")}>
              Continue Shopping
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
