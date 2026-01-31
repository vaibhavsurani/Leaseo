"use client";

import { useRouter } from "next/navigation";
import {
  Search,
  Truck,
  Shield,
  Zap,
  Heart,
  ShoppingCart,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const router = useRouter();

  const categories = [
    {
      id: 1,
      name: "Electronics",
      icon: "📱",
      count: 142,
      image:
        "https://images.unsplash.com/photo-1505228395891-9a51fb63a290?w=300&h=300&fit=crop",
    },
    {
      id: 2,
      name: "Furniture",
      icon: "🪑",
      count: 89,
      image:
        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=300&fit=crop",
    },
    {
      id: 3,
      name: "Vehicles",
      icon: "🚗",
      count: 34,
      image:
        "https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=300&h=300&fit=crop",
    },
    {
      id: 4,
      name: "Party & Events",
      icon: "🎉",
      count: 267,
      image:
        "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=300&h=300&fit=crop",
    },
    {
      id: 5,
      name: "Sports Equipment",
      icon: "⛳",
      count: 156,
      image:
        "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=300&h=300&fit=crop",
    },
    {
      id: 6,
      name: "Tools & Equipment",
      icon: "🔧",
      count: 198,
      image:
        "https://images.unsplash.com/photo-1557672172-298e090d0f80?w=300&h=300&fit=crop",
    },
  ];

  const features = [
    {
      icon: <Truck className="h-8 w-8" />,
      title: "Fast Delivery",
      description: "Get your rentals delivered within 2-4 hours",
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Secure & Safe",
      description: "100% authentic products with security deposit",
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Easy Returns",
      description: "Hassle-free pickup and return process",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold">Rent Anything, Anytime</h1>
            <p className="text-xl opacity-90">
              Discover a world of affordable rentals. From electronics to
              furniture, sports equipment to party supplies – find everything
              you need.
            </p>

            {/* Search Bar */}
            <div className="flex gap-2 bg-white rounded-lg p-1 max-w-md mx-auto">
              <input
                type="text"
                placeholder="Search products..."
                className="flex-1 px-4 py-2 outline-none text-black"
              />
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => router.push("/products")}
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>

            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => router.push("/products")}
            >
              Browse All Products
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">Shop by Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => router.push("/products")}
              className="group cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all"
            >
              <div className="relative h-48 overflow-hidden bg-gray-200">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
              </div>
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {category.count} products
                    </p>
                  </div>
                  <span className="text-3xl">{category.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">
            Why Choose Us?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center space-y-4">
                <div className="flex justify-center text-blue-600">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-16">
        <div className="container mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to Start Renting?</h2>
          <p className="text-lg opacity-90">
            Join thousands of customers saving money by renting instead of
            buying.
          </p>
          <Button
            size="lg"
            className="bg-white text-purple-600 hover:bg-gray-100"
            onClick={() => router.push("/products")}
          >
            Explore Products Now
            <ShoppingCart className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">50K+</div>
            <p className="text-muted-foreground mt-2">Active Users</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">10K+</div>
            <p className="text-muted-foreground mt-2">Products</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">100K+</div>
            <p className="text-muted-foreground mt-2">Rentals Completed</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">4.8★</div>
            <p className="text-muted-foreground mt-2">Customer Rating</p>
          </div>
        </div>
      </section>

      {/* Footer Quick Links */}
      <section className="bg-gray-50 border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">For Renters</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary">
                    Safety Tips
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary">
                    FAQs
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary">
                    Report Issue
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 RentNow. All rights reserved.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
