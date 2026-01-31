"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import {
  getVendorProductById,
  updateProduct,
  deleteProduct,
  toggleProductPublish,
  getCategories,
} from "@/actions/vendor";
import { toast } from "sonner";
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
import { ImageUpload } from "@/components/ui/image-upload";

// Tabs
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Product type for edit page
type ProductData = {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
  costPrice: number;
  quantity: number;
  isPublished: boolean;
  isRentable: boolean;
  description: string | null;
  shortDescription: string | null;
  securityDeposit: number;
  minRentalPeriod: number;
  maxRentalPeriod: number | null;
  category: { id: string; name: string } | null;
  images: { id: string; url: string; isPrimary: boolean }[];
};

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    shortDescription: "",
    costPrice: "",
    basePrice: "",
    securityDeposit: "",
    minRentalPeriod: "",
    maxRentalPeriod: "",
    quantity: "",
    isPublished: false,
    categoryId: "",
    images: [] as { url: string; publicId?: string }[],
  });

  useEffect(() => {
    fetchProduct();
    fetchCategories();
  }, [params.id]);

  const fetchCategories = async () => {
    const result = await getCategories();
    if (result.success && result.data) {
      setCategories(result.data);
    }
  };

  const fetchProduct = async () => {
    try {
      const result = await getVendorProductById(params.id as string);
      if (result.success && result.data) {
        setProduct(result.data);
        setFormData({
          name: result.data.name,
          description: result.data.description || "",
          shortDescription: result.data.shortDescription || "",
          costPrice: result.data.costPrice?.toString() || "",
          basePrice: result.data.basePrice?.toString() || "",
          securityDeposit: result.data.securityDeposit?.toString() || "",
          minRentalPeriod: result.data.minRentalPeriod?.toString() || "",
          maxRentalPeriod: result.data.maxRentalPeriod?.toString() || "",
          quantity: result.data.quantity?.toString() || "",
          isPublished: result.data.isPublished,
          categoryId: result.data.category?.id || "",
          images: result.data.images.map((img) => ({
            url: img.url,
            publicId: undefined,
          })),
        });
      } else {
        toast.error("Product not found");
        router.push("/vendor/products");
      }
    } catch (error) {
      toast.error("Failed to fetch product");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setSaving(true);
    try {
      const result = await updateProduct(product.id, {
        name: formData.name,
        description: formData.description || undefined,
        shortDescription: formData.shortDescription || undefined,
        categoryId: formData.categoryId || undefined,
        costPrice: formData.costPrice
          ? parseFloat(formData.costPrice)
          : undefined,
        basePrice: formData.basePrice
          ? parseFloat(formData.basePrice)
          : undefined,
        securityDeposit: formData.securityDeposit
          ? parseFloat(formData.securityDeposit)
          : undefined,
        minRentalPeriod: formData.minRentalPeriod
          ? parseInt(formData.minRentalPeriod)
          : undefined,
        maxRentalPeriod: formData.maxRentalPeriod
          ? parseInt(formData.maxRentalPeriod)
          : null,
        quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
        images:
          formData.images.length > 0
            ? formData.images.map((img, index) => ({
                url: img.url,
                isPrimary: index === 0,
              }))
            : undefined,
      });

      if (result.success) {
        toast.success("Product updated successfully");
        router.push("/vendor/products");
      } else {
        toast.error(result.error || "Failed to update product");
      }
    } catch (error) {
      toast.error("Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    setDeleting(true);
    try {
      const result = await deleteProduct(product.id);
      if (result.success) {
        toast.success("Product deleted");
        router.push("/vendor/products");
      } else {
        toast.error(result.error || "Failed to delete product");
      }
    } catch (error) {
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!product) return;
    try {
      const result = await toggleProductPublish(product.id);
      if (result.success) {
        setFormData((prev) => ({ ...prev, isPublished: !prev.isPublished }));
        toast.success(
          formData.isPublished ? "Product unpublished" : "Product published",
        );
      } else {
        toast.error(result.error || "Failed to toggle publish status");
      }
    } catch (error) {
      toast.error("Failed to toggle publish status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Product not found</p>
        <Button asChild className="mt-4">
          <Link href="/vendor/products">Back to Products</Link>
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
            <Link href="/vendor/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p className="text-muted-foreground">Edit product details</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2 mr-4">
            <Label htmlFor="publish-toggle" className="text-sm">
              {formData.isPublished ? "Published" : "Unpublished"}
            </Label>
            <Switch
              id="publish-toggle"
              checked={formData.isPublished}
              onCheckedChange={handlePublishToggle}
            />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this product? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">General Information</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Rental</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shortDescription">Short Description</Label>
                    <Input
                      id="shortDescription"
                      value={formData.shortDescription}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          shortDescription: e.target.value,
                        }))
                      }
                      placeholder="Brief product description"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Full Description</Label>
                  <textarea
                    id="description"
                    className="w-full min-h-25 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Detailed product description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Available Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="costPrice">Cost Price (₹)</Label>
                    <Input
                      id="costPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          costPrice: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="basePrice">Base / Sales Price (₹)</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          basePrice: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="securityDeposit">
                      Security Deposit (₹)
                    </Label>
                    <Input
                      id="securityDeposit"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.securityDeposit}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          securityDeposit: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rental Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="minRentalPeriod">
                      Minimum Rental Period (days)
                    </Label>
                    <Input
                      id="minRentalPeriod"
                      type="number"
                      min="1"
                      value={formData.minRentalPeriod}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          minRentalPeriod: e.target.value,
                        }))
                      }
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxRentalPeriod">
                      Maximum Rental Period (days)
                    </Label>
                    <Input
                      id="maxRentalPeriod"
                      type="number"
                      min="1"
                      value={formData.maxRentalPeriod}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          maxRentalPeriod: e.target.value,
                        }))
                      }
                      placeholder="30"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Images</CardTitle>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  value={formData.images}
                  onChange={(images) =>
                    setFormData((prev) => ({ ...prev, images }))
                  }
                  maxImages={5}
                  folder="products"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
