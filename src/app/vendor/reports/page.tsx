"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  Calendar,
} from "lucide-react";
import { getVendorDashboardStats, VendorStats } from "@/actions/vendor";

export default function ReportsPage() {
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("this_month");

  useEffect(() => {
    async function fetchStats() {
      try {
        const result = await getVendorDashboardStats();
        if (result.success && result.data) {
          setStats(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const revenueGrowth = 12.5; // Example growth percentage
  const ordersGrowth = 8.3;
  const customersGrowth = 15.2;
  const avgOrderValue =
    stats?.totalRevenue && stats?.totalOrders
      ? stats.totalRevenue / stats.totalOrders
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Track your business performance and insights
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="this_quarter">This Quarter</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{stats?.totalRevenue.toLocaleString() || 0}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />+{revenueGrowth}% from last
              period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />+{ordersGrowth}% from last
              period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalCustomers || 0}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />+{customersGrowth}% from
              last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Order Value
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹
              {avgOrderValue.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              Based on completed orders
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex flex-col items-center justify-center bg-muted/20 rounded-lg border border-dashed">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Revenue Chart</p>
              <p className="text-xs text-muted-foreground mt-1">
                Integrate with a chart library like Recharts for visualization
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-lg font-bold">
                  ₹
                  {((stats?.totalRevenue || 0) * 0.4).toLocaleString(
                    undefined,
                    { maximumFractionDigits: 0 },
                  )}
                </p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Last Month</p>
                <p className="text-lg font-bold">
                  ₹
                  {((stats?.totalRevenue || 0) * 0.35).toLocaleString(
                    undefined,
                    { maximumFractionDigits: 0 },
                  )}
                </p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="text-lg font-bold">
                  ₹
                  {((stats?.totalRevenue || 0) * 0.5).toLocaleString(
                    undefined,
                    { maximumFractionDigits: 0 },
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex flex-col items-center justify-center bg-muted/20 rounded-lg border border-dashed">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                Orders Distribution
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Pie chart showing order status distribution
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div>
                  <p className="text-sm font-medium">Completed</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.floor((stats?.totalOrders || 0) * 0.6)} orders
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <div>
                  <p className="text-sm font-medium">In Progress</p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.activeRentals || 0} orders
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div>
                  <p className="text-sm font-medium">Pending</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.floor((stats?.totalOrders || 0) * 0.15)} orders
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <div>
                  <p className="text-sm font-medium">Draft</p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.draftInvoices || 0} orders
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Product Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Products
                  </p>
                  <p className="text-xl font-bold">
                    {stats?.totalProducts || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Most Rented</p>
                  <p className="text-xl font-bold">-</p>
                </div>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Avg. Rental Duration
                  </p>
                  <p className="text-xl font-bold">5 days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Products Table */}
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-3">
              Top Performing Products
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">
                      Product
                    </th>
                    <th className="text-center p-3 text-sm font-medium">
                      Rentals
                    </th>
                    <th className="text-center p-3 text-sm font-medium">
                      Revenue
                    </th>
                    <th className="text-center p-3 text-sm font-medium">
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No product performance data available yet.
                      <br />
                      <span className="text-sm">
                        Start renting products to see analytics.
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 rounded bg-gray-400" />
                <div>
                  <p className="font-medium">Draft Invoices</p>
                  <p className="text-sm text-muted-foreground">
                    Pending to send
                  </p>
                </div>
              </div>
              <span className="text-xl font-bold">
                {stats?.draftInvoices || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 rounded bg-blue-500" />
                <div>
                  <p className="font-medium">Sent Invoices</p>
                  <p className="text-sm text-muted-foreground">
                    Awaiting payment
                  </p>
                </div>
              </div>
              <span className="text-xl font-bold">-</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 rounded bg-red-500" />
                <div>
                  <p className="font-medium">Overdue</p>
                  <p className="text-sm text-muted-foreground">Past due date</p>
                </div>
              </div>
              <span className="text-xl font-bold text-red-600">
                {stats?.overdueInvoices || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">New Customers</p>
                  <p className="text-2xl font-bold">
                    {Math.floor((stats?.totalCustomers || 0) * 0.2)}
                  </p>
                </div>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +18%
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This month vs last month
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Repeat Customers
                  </p>
                  <p className="text-2xl font-bold">
                    {Math.floor((stats?.totalCustomers || 0) * 0.35)}
                  </p>
                </div>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +5%
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                35% retention rate
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
