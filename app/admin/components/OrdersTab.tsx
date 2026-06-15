"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Order, PaymentType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
  const [restoreInventory, setRestoreInventory] = useState(true);
  const [refundMethod, setRefundMethod] = useState<PaymentType>("cash");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
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

  const openRefundDialog = (order: Order) => {
    setRefundOrder(order);
    setRestoreInventory(true);
    setRefundMethod(order.payment_type);
    setRefundReason("");
  };

  const handleRefund = async () => {
    if (!refundOrder) return;
    setRefunding(true);

    // Update order status
    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: "refunded" })
      .eq("id", refundOrder.id);

    if (orderError) {
      toast.error("Failed to refund order");
      setRefunding(false);
      return;
    }

    // Log the refund
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("refunds").insert({
      order_id: refundOrder.id,
      amount: refundOrder.total,
      method: refundMethod,
      restore_inventory: restoreInventory,
      reason: refundReason || null,
      cashier_id: userData.user?.id,
    });

    // Restore stock if requested
    if (restoreInventory) {
      for (const item of refundOrder.items) {
        await supabase.rpc("increment_stock", {
          p_id: item.product_id,
          qty: item.quantity,
        });
      }
    }

    toast.success(
      `Order refunded${restoreInventory ? " and stock restored" : ""}`
    );
    setRefundOrder(null);
    setRefunding(false);
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
            <TableHead>Order #</TableHead>
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
                #{String(order.order_number).padStart(4, "0")}
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
                    onClick={() => openRefundDialog(order)}
                  >
                    Refund
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Order Details Dialog */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Order #{selectedOrder ? String(selectedOrder.order_number).padStart(4, "0") : ""}
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
                  {selectedOrder.payment_ref && ` (Ref: ${selectedOrder.payment_ref})`}
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span> $
                  {selectedOrder.total.toFixed(2)}
                </div>
                <div>
                  <span className="text-muted-foreground">Table:</span>{" "}
                  {selectedOrder.table_number || "—"}
                </div>
                {selectedOrder.payment_type === "cash" && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Received:</span> $
                      {selectedOrder.amount_received.toFixed(2)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Change:</span> $
                      {selectedOrder.change_amount.toFixed(2)}
                    </div>
                  </>
                )}
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

      {/* Refund Dialog */}
      <Dialog
        open={!!refundOrder}
        onOpenChange={() => setRefundOrder(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Refund Order #{refundOrder ? String(refundOrder.order_number).padStart(4, "0") : ""}
            </DialogTitle>
          </DialogHeader>
          {refundOrder && (
            <div className="space-y-4">
              <div className="text-sm">
                <p>
                  Amount: <span className="font-bold">${refundOrder.total.toFixed(2)}</span>
                </p>
                <p className="text-muted-foreground">
                  {refundOrder.items.length} item(s)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Restore inventory quantities?</Label>
                <div className="flex gap-2">
                  <Button
                    variant={restoreInventory ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRestoreInventory(true)}
                  >
                    Yes
                  </Button>
                  <Button
                    variant={!restoreInventory ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRestoreInventory(false)}
                  >
                    No
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Refund payment method</Label>
                <Select
                  value={refundMethod}
                  onValueChange={(v) => setRefundMethod(v as PaymentType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Input
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer complaint, wrong order"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOrder(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefund}
              disabled={refunding}
            >
              {refunding ? "Processing..." : "Confirm Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
