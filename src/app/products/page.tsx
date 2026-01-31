"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  Grid,
  List,
  Heart,
  ShoppingCart,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProducts, getCategories } from "@/actions/products";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "@/actions/wishlist";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  securityDeposit: number;
  quantity: number;
  isRentable: boolean;
  images: Array<{
    id: string;
    url: string;
    alt: string | null;
    isPrimary: boolean;
  }>;
  category: { id: string; name: string; slug: string } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [priceRange, setPriceRange] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    fetchData();
  }, [search, selectedCategory, sortBy, priceRange]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const [sortField, sortOrder] = sortBy.split("-") as [
        string,
        "asc" | "desc",
      ];

      const [productsData, categoriesData, wishlistData] = await Promise.all([
        getProducts({
          search,
          categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
          sortBy: sortBy,
          minPrice:
            priceRange === "0-500"
              ? 0
              : priceRange === "500-1000"
                ? 500
                : priceRange === "1000+"
                  ? 1000
                  : undefined,
          maxPrice:
            priceRange === "0-500"
              ? 500
              : priceRange === "500-1000"
                ? 1000
                : undefined,
        }),
        getCategories(),
        getWishlist(),
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
      setWishlistIds(new Set(wishlistData.map((item) => item.productId)));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWishlistToggle = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    startTransition(async () => {
      if (wishlistIds.has(productId)) {
        const result = await removeFromWishlist(productId);
        if (result.success) {
          setWishlistIds((prev) => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
          });
          toast.success("Removed from wishlist");
        } else {
          toast.error(result.error || "Failed to remove from wishlist");
        }
      } else {
        const result = await addToWishlist(productId);
        if (result.success) {
          setWishlistIds((prev) => new Set([...prev, productId]));
          toast.success("Added to wishlist");
        } else {
          toast.error(result.error || "Failed to add to wishlist");
        }
      }
    });
  };

  const handleProductClick = (slug: string) => {
    router.push(`/products/${slug}`);
  };

  if (isLoading && products.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-2">
            Browse our collection of rental items
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Price Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prices</SelectItem>
              <SelectItem value="0-500">₹0 - ₹500</SelectItem>
              <SelectItem value="500-1000">₹500 - ₹1000</SelectItem>
              <SelectItem value="1000+">₹1000+</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="price-asc">Price Low to High</SelectItem>
              <SelectItem value="price-desc">Price High to Low</SelectItem>
              <SelectItem value="createdAt-desc">Newest First</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Products Grid/List */}
        {products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No products found</h2>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const primaryImage =
                product.images.find((img) => img.isPrimary) ||
                product.images[0];
              return (
                <Card
                  key={product.id}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleProductClick(product.slug)}
                >
                  <div className="aspect-square bg-muted relative">
                    {primaryImage ? (
                      <img
                        src={primaryImage.url}
                        alt={primaryImage.alt || product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground opacity-50" />
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`absolute top-2 right-2 rounded-full bg-white/80 hover:bg-white ${
                        wishlistIds.has(product.id) ? "text-red-500" : ""
                      }`}
                      onClick={(e) => handleWishlistToggle(product.id, e)}
                      disabled={isPending}
                    >
                      <Heart
                        className={`h-4 w-4 ${wishlistIds.has(product.id) ? "fill-current" : ""}`}
                      />
                    </Button>
                    {product.quantity <= 3 && product.quantity > 0 && (
                      <span className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                        Only {product.quantity} left
                      </span>
                    )}
                    {product.quantity === 0 && (
                      <span className="absolute bottom-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        Out of stock
                      </span>
                    )}
                  </div>
                  <CardContent className="p-4">
                    {product.category && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {product.category.name}
                      </p>
                    )}
                    <h3 className="font-semibold line-clamp-1">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <span className="text-lg font-bold text-primary">
                          ₹{product.basePrice}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /day
                        </span>
                      </div>
                      <Button size="sm" variant="outline">
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Rent
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => {
              const primaryImage =
                product.images.find((img) => img.isPrimary) ||
                product.images[0];
              return (
                <Card
                  key={product.id}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleProductClick(product.slug)}
                >
                  <div className="flex">
                    <div className="w-48 h-48 bg-muted relative shrink-0">
                      {primaryImage ? (
                        <img
                          src={primaryImage.url}
                          alt={primaryImage.alt || product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground opacity-50" />
                        </div>
                      )}
                    </div>
                    <CardContent className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        {product.category && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {product.category.name}
                          </p>
                        )}
                        <h3 className="font-semibold text-lg">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div>
                          <span className="text-xl font-bold text-primary">
                            ₹{product.basePrice}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            /day
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={
                              wishlistIds.has(product.id) ? "text-red-500" : ""
                            }
                            onClick={(e) => handleWishlistToggle(product.id, e)}
                            disabled={isPending}
                          >
                            <Heart
                              className={`h-5 w-5 ${wishlistIds.has(product.id) ? "fill-current" : ""}`}
                            />
                          </Button>
                          <Button>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Rent Now
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
