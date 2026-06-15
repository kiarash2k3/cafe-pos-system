"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Order } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DollarSign, ShoppingCart, TrendingUp } from "lucide-react";

interface DailyStat {
  date: string;
  revenue: number;
  cogs: number;
  profit: number;
  orderCount: number;
}

export default function ReportsTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  const supabase = createClient();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["paid", "completed"])
      .gte("paid_at", `${dateFrom}T00:00:00`)
      .lte("paid_at", `${dateTo}T23:59:59`)
      .order("paid_at", { ascending: true });

    if (data) setOrders(data);
    setLoading(false);
  }, [supabase, dateFrom, dateTo]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalCogs = orders.reduce(
    (s, o) =>
      s + o.items.reduce((is, i) => is + i.cost * i.quantity, 0),
    0
  );
  const totalProfit = totalRevenue - totalCogs;
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Group by day
  const dailyStats: DailyStat[] = [];
  const dayMap = new Map<string, DailyStat>();

  orders.forEach((order) => {
    const date = new Date(order.paid_at!).toLocaleDateString("en-CA");
    if (!dayMap.has(date)) {
      dayMap.set(date, { date, revenue: 0, cogs: 0, profit: 0, orderCount: 0 });
    }
    const stat = dayMap.get(date)!;
    stat.revenue += order.total;
    stat.cogs += order.items.reduce((s, i) => s + i.cost * i.quantity, 0);
    stat.profit = stat.revenue - stat.cogs;
    stat.orderCount += 1;
  });

  dayMap.forEach((v) => dailyStats.push(v));
  dailyStats.sort((a, b) => a.date.localeCompare(b.date));

  // Top-selling products
  const productSales = new Map<string, { name: string; qty: number; revenue: number }>();
  orders.forEach((order) => {
    order.items.forEach((item) => {
      const key = item.product_id || item.name;
      const existing = productSales.get(key) || {
        name: item.name,
        qty: 0,
        revenue: 0,
      };
      existing.qty += item.quantity;
      existing.revenue += item.price * item.quantity;
      productSales.set(key, existing);
    });
  });

  const topProducts = Array.from(productSales.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  if (loading) return <p className="text-muted-foreground p-4">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <h2 className="text-xl font-semibold">Reports</h2>
        <div className="flex gap-2 items-end ml-auto">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              className="w-40 h-8"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              className="w-40 h-8"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">COGS</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCogs.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalProfit.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ${avgOrderValue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profit Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue vs COGS vs Profit</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(value) => `$${Number(value).toFixed(2)}`}
                />
                <Legend />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="hsl(220, 70%, 50%)"
                />
                <Bar dataKey="cogs" name="COGS" fill="hsl(0, 70%, 50%)" />
                <Bar
                  dataKey="profit"
                  name="Profit"
                  fill="hsl(140, 70%, 40%)"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-10">
              No data for the selected period
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top-Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <div className="space-y-2">
              {topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-mono w-6">
                      #{idx + 1}
                    </span>
                    <span className="font-medium">{p.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {p.qty} sold · ${p.revenue.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No sales data
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
