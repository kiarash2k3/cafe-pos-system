"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coffee, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchOrders = useCallback(async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from("orders")
      .select("*, profiles(full_name)")
      .in("status", ["paid", "completed"])
      .gte("paid_at", twoHoursAgo)
      .order("paid_at", { ascending: true });

    if (data) setOrders(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const markComplete = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to mark order complete");
    } else {
      toast.success("Order marked complete");
      fetchOrders();
    }
  };

  const getTimeSince = (dateStr: string) => {
    const mins = Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / 60000
    );
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <nav className="border-b bg-background">
        <div className="flex h-14 items-center px-4 gap-4">
          <Coffee className="h-6 w-6" />
          <span className="font-semibold text-lg">Kitchen Display</span>
          <Badge variant="outline" className="ml-auto">
            Auto-refresh: 10s
          </Badge>
        </div>
      </nav>

      <div className="p-4">
        {orders.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-xl">No active orders</p>
            <p className="text-sm mt-2">
              Orders will appear here when paid
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((order) => {
              const isNew =
                order.paid_at &&
                Date.now() - new Date(order.paid_at).getTime() < 5 * 60 * 1000;
              const isCompleted = order.status === "completed";

              return (
                <div
                  key={order.id}
                  className={`rounded-lg border p-4 ${
                    isCompleted
                      ? "bg-muted/50 opacity-60"
                      : isNew
                      ? "bg-yellow-50 border-yellow-300 dark:bg-yellow-950/20"
                      : "bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-bold text-lg">
                        #{String(order.order_number).padStart(4, "0")}
                      </span>
                      {order.table_number && (
                        <Badge variant="secondary" className="ml-2">
                          Table {order.table_number}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {order.paid_at && getTimeSince(order.paid_at)}
                    </div>
                  </div>

                  <div className="space-y-1 mb-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {isCompleted ? (
                    <div className="flex items-center justify-center gap-2 text-green-600 py-2">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Completed</span>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => markComplete(order.id)}
                    >
                      Mark Complete
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
