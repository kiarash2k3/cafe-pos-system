"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const supabase = createClient();

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setOrders(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRefund = async (order: Order) => {
    if (!confirm("Refund this order? Stock will be restored.")) return;

    const { error } = await supabase
      .from("orders")
      .update({ status: "refunded" })
      .eq("id", order.id);

    if (error) {
      toast.error("Failed to refund order");
      return;
    }

    // Restore stock
    for (const item of order.items) {
      await supabase.rpc("increment_stock", {
        p_id: item.product_id,
        qty: item.quantity,
      });
    }

    toast.success("Order refunded and stock restored");
    fetchOrders();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      case "refunded":
        return "destructive";
      case "completed":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (loading) return <p className="text-muted-foreground p-4">Loading...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Orders</h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Cashier</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell
                className="font-mono cursor-pointer hover:underline"
                onClick={() => setSelectedOrder(order)}
              >
                #{order.id.slice(0, 8).toUpperCase()}
              </TableCell>
              <TableCell>
                <Badge variant={statusColor(order.status)}>
                  {order.status}
                </Badge>
              </TableCell>
              <TableCell className="capitalize">
                {order.payment_type}
                {order.payment_ref && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (Ref: {order.payment_ref})
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
                ${order.total.toFixed(2)}
              </TableCell>
              <TableCell>{order.profiles?.full_name || "—"}</TableCell>
              <TableCell>
                {new Date(order.created_at).toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {order.status === "paid" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRefund(order)}
                  >
                    Refund
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Order #{selectedOrder?.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge variant={statusColor(selectedOrder.status)}>
                    {selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment:</span>{" "}
                  {selectedOrder.payment_type}
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span> $
                  {selectedOrder.total.toFixed(2)}
                </div>
                <div>
                  <span className="text-muted-foreground">Table:</span>{" "}
                  {selectedOrder.table_number || "—"}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Items</h4>
                {selectedOrder.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-sm py-1 border-b last:border-0"
                  >
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
