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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Save, Settings, X } from "lucide-react";
import {
  createProduct,
  getCategories,
  getAttributes,
  createAttribute,
  addAttributeValue,
  generateVariants,
  ProductAttributeData,
} from "@/actions/vendor";
import { RentalPeriodType } from "@prisma/client";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";

type RentalPricing = {
  id: string;
  periodType: RentalPeriodType;
  duration: number;
  price: number;
};

type AttributeLine = {
  id: string;
  attributeId: string;
  attributeName: string;
  selectedValues: { id: string; value: string }[];
};

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [attributes, setAttributes] = useState<ProductAttributeData[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [minRentalPeriod, setMinRentalPeriod] = useState("1");
  const [maxRentalPeriod, setMaxRentalPeriod] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [productType, setProductType] = useState<"goods" | "service">("goods");
  const [rentalPricing, setRentalPricing] = useState<RentalPricing[]>([]);
  const [images, setImages] = useState<{ url: string; publicId?: string }[]>(
    [],
  );

  // Attribute state
  const [attributeLines, setAttributeLines] = useState<AttributeLine[]>([]);
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  const [selectedAttributeLine, setSelectedAttributeLine] =
    useState<AttributeLine | null>(null);
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newValueInput, setNewValueInput] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const [categoriesResult, attributesResult] = await Promise.all([
        getCategories(),
        getAttributes(),
      ]);
      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data);
      }
      if (attributesResult.success && attributesResult.data) {
        setAttributes(attributesResult.data);
      }
    };
    fetchData();
  }, []);

  // Generate SKU from name
  useEffect(() => {
    if (name && !sku) {
      const generatedSku =
        name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 6) +
        "-" +
        Date.now().toString().slice(-4);
      setSku(generatedSku);
    }
  }, [name]);

  const addRentalPricing = () => {
    setRentalPricing([
      ...rentalPricing,
      {
        id: crypto.randomUUID(),
        periodType: "DAILY",
        duration: 1,
        price: parseFloat(basePrice) || 0,
      },
    ]);
  };

  const removeRentalPricing = (id: string) => {
    setRentalPricing(rentalPricing.filter((rp) => rp.id !== id));
  };

  const updateRentalPricing = (id: string, updates: Partial<RentalPricing>) => {
    setRentalPricing(
      rentalPricing.map((rp) => (rp.id === id ? { ...rp, ...updates } : rp)),
    );
  };

  // Attribute functions
  const addAttributeLine = () => {
    setAttributeLines([
      ...attributeLines,
      {
        id: crypto.randomUUID(),
        attributeId: "",
        attributeName: "",
        selectedValues: [],
      },
    ]);
  };

  const removeAttributeLine = (id: string) => {
    setAttributeLines(attributeLines.filter((line) => line.id !== id));
  };

  const updateAttributeLine = (id: string, attributeId: string) => {
    const attr = attributes.find((a) => a.id === attributeId);
    setAttributeLines(
      attributeLines.map((line) =>
        line.id === id
          ? {
              ...line,
              attributeId,
              attributeName: attr?.name || "",
              selectedValues: [],
            }
          : line,
      ),
    );
  };

  const openConfigureDialog = (line: AttributeLine) => {
    setSelectedAttributeLine(line);
    setConfigureDialogOpen(true);
  };

  const toggleValueSelection = (valueId: string, value: string) => {
    if (!selectedAttributeLine) return;

    const isSelected = selectedAttributeLine.selectedValues.some(
      (v) => v.id === valueId,
    );

    const updatedValues = isSelected
      ? selectedAttributeLine.selectedValues.filter((v) => v.id !== valueId)
      : [...selectedAttributeLine.selectedValues, { id: valueId, value }];

    setSelectedAttributeLine({
      ...selectedAttributeLine,
      selectedValues: updatedValues,
    });
  };

  const saveConfigureDialog = () => {
    if (!selectedAttributeLine) return;

    setAttributeLines(
      attributeLines.map((line) =>
        line.id === selectedAttributeLine.id ? selectedAttributeLine : line,
      ),
    );
    setConfigureDialogOpen(false);
    setSelectedAttributeLine(null);
  };

  const handleCreateAttribute = async () => {
    if (!newAttributeName.trim()) return;

    const result = await createAttribute(newAttributeName.trim());
    if (result.success && result.data) {
      setAttributes([
        ...attributes,
        { id: result.data.id, name: result.data.name, values: [] },
      ]);
      setNewAttributeName("");
      toast.success("Attribute created");
    } else {
      toast.error(result.error || "Failed to create attribute");
    }
  };

  const handleAddValue = async () => {
    if (!selectedAttributeLine?.attributeId || !newValueInput.trim()) return;

    const result = await addAttributeValue(
      selectedAttributeLine.attributeId,
      newValueInput.trim(),
    );

    if (result.success && result.data) {
      // Update local attributes state
      setAttributes(
        attributes.map((attr) =>
          attr.id === selectedAttributeLine.attributeId
            ? {
                ...attr,
                values: [
                  ...attr.values,
                  { id: result.data!.id, value: result.data!.value },
                ],
              }
            : attr,
        ),
      );
      setNewValueInput("");
      toast.success("Value added");
    } else {
      toast.error(result.error || "Failed to add value");
    }
  };

  const getAvailableAttributes = () => {
    const usedAttributeIds = attributeLines.map((line) => line.attributeId);
    return attributes.filter((attr) => !usedAttributeIds.includes(attr.id));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!sku.trim()) {
      toast.error("SKU is required");
      return;
    }
    if (!basePrice || parseFloat(basePrice) <= 0) {
      toast.error("Valid sales price is required");
      return;
    }

    setLoading(true);
    try {
      const result = await createProduct({
        name: name.trim(),
        sku: sku.trim(),
        description: description.trim() || undefined,
        shortDescription: shortDescription.trim() || undefined,
        categoryId: categoryId || undefined,
        costPrice: parseFloat(costPrice) || 0,
        basePrice: parseFloat(basePrice),
        securityDeposit: parseFloat(securityDeposit) || 0,
        quantity: parseInt(quantity) || 0,
        minRentalPeriod: parseInt(minRentalPeriod) || 1,
        maxRentalPeriod: maxRentalPeriod
          ? parseInt(maxRentalPeriod)
          : undefined,
        isPublished,
        images:
          images.length > 0
            ? images.map((img, index) => ({
                url: img.url,
                isPrimary: index === 0,
              }))
            : undefined,
        rentalPricing:
          rentalPricing.length > 0
            ? rentalPricing.map((rp) => ({
                periodType: rp.periodType,
                duration: rp.duration,
                price: rp.price,
              }))
            : undefined,
      });

      if (result.success && result.data) {
        // Generate variants if attribute lines are configured
        const validAttributeLines = attributeLines.filter(
          (line) => line.attributeId && line.selectedValues.length > 0,
        );

        if (validAttributeLines.length > 0) {
          const attributeValueGroups = validAttributeLines.map((line) => ({
            attributeId: line.attributeId,
            valueIds: line.selectedValues.map((v) => v.id),
          }));

          const variantResult = await generateVariants(
            result.data.id,
            attributeValueGroups,
          );

          if (variantResult.success && variantResult.data) {
            toast.success(
              `Product created with ${variantResult.data.count} variants`,
            );
          } else {
            toast.success(
              "Product created, but variants generation had issues",
            );
          }
        } else {
          toast.success("Product created successfully");
        }
        router.push("/vendor/products");
      } else {
        toast.error(result.error || "Failed to create product");
      }
    } catch (error) {
      toast.error("Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/vendor/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Product</h1>
            <p className="text-muted-foreground">Add a new rental product</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/vendor/products">Cancel</Link>
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Product"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList>
              <TabsTrigger value="general">General Information</TabsTrigger>
              <TabsTrigger value="attributes">
                Attributes & Variants
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 mt-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter product name"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU *</Label>
                      <Input
                        id="sku"
                        value={sku}
                        onChange={(e) => setSku(e.target.value.toUpperCase())}
                        placeholder="Product SKU"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No categories available
                            </SelectItem>
                          ) : (
                            categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {categories.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Contact admin to add categories
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Product Type</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="productType"
                          checked={productType === "goods"}
                          onChange={() => setProductType("goods")}
                          className="rounded-full"
                        />
                        <span>Goods</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="productType"
                          checked={productType === "service"}
                          onChange={() => setProductType("service")}
                          className="rounded-full"
                        />
                        <span>Service</span>
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      If the vendor wants to add deposit or downpayment with the
                      product then the vendor needs to create product (Type
                      Service) named deposit/downpayment and add it in the
                      invoice.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shortDesc">Short Description</Label>
                    <Input
                      id="shortDesc"
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      placeholder="Brief product description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Full Description</Label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full min-h-[120px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Detailed product description..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pricing & Inventory</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="costPrice">Cost Price</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          id="costPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          value={costPrice}
                          onChange={(e) => setCostPrice(e.target.value)}
                          className="pl-7"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="basePrice">Sales Price (Per Day) *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          id="basePrice"
                          type="number"
                          min="0"
                          step="0.01"
                          value={basePrice}
                          onChange={(e) => setBasePrice(e.target.value)}
                          className="pl-7"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="securityDeposit">Security Deposit</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          id="securityDeposit"
                          type="number"
                          min="0"
                          step="0.01"
                          value={securityDeposit}
                          onChange={(e) => setSecurityDeposit(e.target.value)}
                          className="pl-7"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity on Hand</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="minRental">
                        Min Rental Period (Days)
                      </Label>
                      <Input
                        id="minRental"
                        type="number"
                        min="1"
                        value={minRentalPeriod}
                        onChange={(e) => setMinRentalPeriod(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxRental">
                        Max Rental Period (Days)
                      </Label>
                      <Input
                        id="maxRental"
                        type="number"
                        min="1"
                        value={maxRentalPeriod}
                        onChange={(e) => setMaxRentalPeriod(e.target.value)}
                        placeholder="No limit"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rental Pricing Options */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">
                    Rental Pricing Options
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addRentalPricing}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Pricing
                  </Button>
                </CardHeader>
                <CardContent>
                  {rentalPricing.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No custom pricing. Using base daily rate.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {rentalPricing.map((rp) => (
                        <div
                          key={rp.id}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          <Select
                            value={rp.periodType}
                            onValueChange={(value) =>
                              updateRentalPricing(rp.id, {
                                periodType: value as RentalPeriodType,
                              })
                            }
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HOURLY">Hourly</SelectItem>
                              <SelectItem value="DAILY">Daily</SelectItem>
                              <SelectItem value="WEEKLY">Weekly</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min="1"
                            value={rp.duration}
                            onChange={(e) =>
                              updateRentalPricing(rp.id, {
                                duration: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-[80px]"
                          />
                          <span className="text-sm text-muted-foreground">
                            ×
                          </span>
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              ₹
                            </span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={rp.price}
                              onChange={(e) =>
                                updateRentalPricing(rp.id, {
                                  price: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="pl-7"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500"
                            onClick={() => removeRentalPricing(rp.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attributes" className="space-y-6 mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Attributes</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addAttributeLine}
                    disabled={
                      getAvailableAttributes().length === 0 &&
                      attributeLines.length > 0
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Attribute
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium">
                            Attribute
                          </th>
                          <th className="text-left p-3 text-sm font-medium">
                            Values
                          </th>
                          <th className="text-center p-3 text-sm font-medium w-24">
                            Configure
                          </th>
                          <th className="text-center p-3 text-sm font-medium w-16">
                            Remove
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {attributeLines.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="p-4 text-center text-muted-foreground text-sm"
                            >
                              No attributes added. Click &quot;Add
                              Attribute&quot; to start.
                            </td>
                          </tr>
                        ) : (
                          attributeLines.map((line) => (
                            <tr key={line.id} className="border-t">
                              <td className="p-3">
                                <Select
                                  value={line.attributeId}
                                  onValueChange={(value) =>
                                    updateAttributeLine(line.id, value)
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select attribute" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {attributes
                                      .filter(
                                        (attr) =>
                                          attr.id === line.attributeId ||
                                          !attributeLines.some(
                                            (l) => l.attributeId === attr.id,
                                          ),
                                      )
                                      .map((attr) => (
                                        <SelectItem
                                          key={attr.id}
                                          value={attr.id}
                                        >
                                          {attr.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {line.selectedValues.length === 0 ? (
                                    <span className="text-muted-foreground text-sm">
                                      No values selected
                                    </span>
                                  ) : (
                                    line.selectedValues.map((v) => (
                                      <Badge
                                        key={v.id}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {v.value}
                                      </Badge>
                                    ))
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openConfigureDialog(line)}
                                  disabled={!line.attributeId}
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </td>
                              <td className="p-3 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500"
                                  onClick={() => removeAttributeLine(line.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Create New Attribute */}
                  <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                    <p className="text-sm font-medium mb-2">
                      Create New Attribute
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. Color, Size, Brand"
                        value={newAttributeName}
                        onChange={(e) => setNewAttributeName(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={handleCreateAttribute}
                        disabled={!newAttributeName.trim()}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4">
                    Add attributes like Color, Size, or Brand. After saving the
                    product, you can generate variants from these attribute
                    combinations.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Publish</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm">Product is published</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPublished}
                  onClick={() => setIsPublished(!isPublished)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isPublished ? "bg-primary" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isPublished ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Only admin should have the right to publish or unpublish a
                product
              </p>
            </CardContent>
          </Card>

          {/* Product Images */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product Images</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={images}
                onChange={setImages}
                maxImages={5}
                folder="products"
              />
            </CardContent>
          </Card>

          {/* Note */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Dropdown of different kinds of units can
                be added later (Per Units, Per Day, etc.)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Configure Values Dialog */}
      <Dialog open={configureDialogOpen} onOpenChange={setConfigureDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Configure {selectedAttributeLine?.attributeName || "Attribute"}{" "}
              Values
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Available Values */}
            <div>
              <p className="text-sm font-medium mb-2">Select Values</p>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                {selectedAttributeLine &&
                  attributes
                    .find((a) => a.id === selectedAttributeLine.attributeId)
                    ?.values.map((v) => {
                      const isSelected =
                        selectedAttributeLine.selectedValues.some(
                          (sv) => sv.id === v.id,
                        );
                      return (
                        <label
                          key={v.id}
                          className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleValueSelection(v.id, v.value)}
                            className="rounded"
                          />
                          <span className="text-sm">{v.value}</span>
                        </label>
                      );
                    })}
                {selectedAttributeLine &&
                  attributes.find(
                    (a) => a.id === selectedAttributeLine.attributeId,
                  )?.values.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No values available. Add some below.
                    </p>
                  )}
              </div>
            </div>

            {/* Add New Value */}
            <div>
              <p className="text-sm font-medium mb-2">Add New Value</p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Red, Large, etc."
                  value={newValueInput}
                  onChange={(e) => setNewValueInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddValue();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={handleAddValue}
                  disabled={!newValueInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Selected Values Preview */}
            {selectedAttributeLine &&
              selectedAttributeLine.selectedValues.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Selected Values</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAttributeLine.selectedValues.map((v) => (
                      <Badge
                        key={v.id}
                        variant="default"
                        className="flex items-center gap-1"
                      >
                        {v.value}
                        <button
                          type="button"
                          onClick={() => toggleValueSelection(v.id, v.value)}
                          className="ml-1 hover:text-red-300"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfigureDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveConfigureDialog}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
