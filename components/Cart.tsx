"use client";

import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Order, PaymentType } from "@/lib/types";
import Receipt from "@/components/Receipt";

interface CartProps {
  cashierId: string;
  taxRate: number;
}

export default function Cart({ cashierId, taxRate }: CartProps) {
  const { items, tableNumber, updateQuantity, removeItem, clearCart, setTableNumber, restoreCart } =
    useCartStore();
  const [showPayment, setShowPayment] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [processing, setProcessing] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [showPending, setShowPending] = useState(false);
  const [, setLastOrder] = useState<Order | null>(null);

  const supabase = createClient();

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  const changeAmount =
    paymentType === "cash" && amountReceived
      ? Math.max(0, parseFloat(amountReceived) - total)
      : 0;

  const fetchPendingOrders = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("cashier_id", cashierId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (data) setPendingOrders(data);
  }, [cashierId, supabase]);

  const handleSavePending = async () => {
    if (items.length === 0) return;
    setProcessing(true);

    const { error } = await supabase.from("orders").insert({
      status: "pending",
      items,
      subtotal,
      tax: taxAmount,
      total,
      payment_type: "cash",
      cashier_id: cashierId,
      table_number: tableNumber,
    });

    if (error) {
      toast.error("Failed to save pending order");
    } else {
      toast.success("Order saved as pending");
      clearCart();
    }
    setProcessing(false);
  };

  const handleCharge = async () => {
    if (items.length === 0) return;

    if (paymentType === "cash") {
      const received = parseFloat(amountReceived);
      if (isNaN(received) || received < total) {
        toast.error("Insufficient amount received");
        return;
      }
    }

    if (paymentType === "credit") {
      if (!paymentRef || !/^\d{4,8}$/.test(paymentRef)) {
        toast.error("Transaction reference must be exactly 4-8 digits (numbers only, no letters or spaces)");
        return;
      }
    }

    setProcessing(true);

    const orderData = {
      status: "paid" as const,
      items,
      subtotal,
      tax: taxAmount,
      total,
      payment_type: paymentType,
      payment_ref: paymentType === "credit" ? paymentRef : null,
      amount_received: paymentType === "cash" ? parseFloat(amountReceived) : total,
      change_amount: paymentType === "cash" ? changeAmount : 0,
      cashier_id: cashierId,
      table_number: tableNumber,
      paid_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (error) {
      toast.error("Failed to process payment");
      setProcessing(false);
      return;
    }

    // Decrement stock for each item
    for (const item of items) {
      await supabase.rpc("decrement_stock", {
        p_id: item.product_id,
        qty: item.quantity,
      });
    }

    toast.success("Payment processed!");
    setLastOrder(data);
    clearCart();
    setShowPayment(false);
    setAmountReceived("");
    setPaymentRef("");
    setProcessing(false);

    // Print receipt
    printReceipt(data);
  };

  const printReceipt = (order: Order) => {
    const receiptWindow = window.open("", "_blank", "width=400,height=600");
    if (!receiptWindow) return;

    const receiptHtml = Receipt({ order, taxRate });
    receiptWindow.document.write(receiptHtml);
    receiptWindow.document.close();
    receiptWindow.onload = () => {
      receiptWindow.print();
    };
  };

  const restorePendingOrder = (order: Order) => {
    restoreCart(order.items, order.table_number);
    setShowPending(false);
    toast.info("Order restored to cart");
  };

  // Keyboard shortcut: Enter to charge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "Enter" && items.length > 0 && !showPayment) {
        setShowPayment(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items.length, showPayment]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-lg">Cart</h2>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Table #"
            className="w-20 h-8 text-sm"
            value={tableNumber ?? ""}
            onChange={(e) =>
              setTableNumber(e.target.value ? parseInt(e.target.value) : null)
            }
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Cart is empty
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.product_id}
              className="flex items-center gap-2 p-2 rounded-md border text-sm"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-muted-foreground">
                  ${item.price.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    updateQuantity(item.product_id, item.quantity - 1)
                  }
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">
                  {item.quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    updateQuantity(item.product_id, item.quantity + 1)
                  }
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeItem(item.product_id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <span className="font-medium w-16 text-right">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>

      <Separator className="my-3" />

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Tax ({taxRate}%)</span>
          <span>${taxAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              fetchPendingOrders();
              setShowPending(true);
            }}
          >
            Pending Orders
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleSavePending}
            disabled={items.length === 0 || processing}
          >
            Save Pending
          </Button>
        </div>
        <Button
          size="lg"
          className="w-full"
          onClick={() => setShowPayment(true)}
          disabled={items.length === 0}
        >
          Charge ${total.toFixed(2)}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Press Enter to charge
        </p>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment — ${total.toFixed(2)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={paymentType === "cash" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaymentType("cash")}
              >
                Cash
              </Button>
              <Button
                variant={paymentType === "credit" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaymentType("credit")}
              >
                Credit
              </Button>
            </div>

            {paymentType === "cash" && (
              <div className="space-y-2">
                <Label>Amount Received</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={total}
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder={`Min $${total.toFixed(2)}`}
                  autoFocus
                />
                {amountReceived && parseFloat(amountReceived) >= total && (
                  <div className="text-lg font-bold text-green-600">
                    Change: ${changeAmount.toFixed(2)}
                  </div>
                )}
              </div>
            )}

            {paymentType === "credit" && (
              <div className="space-y-2">
                <Label>Transaction Reference (4-8 digits, numbers only)</Label>
                <Input
                  type="text"
                  maxLength={8}
                  value={paymentRef}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPaymentRef(val);
                  }}
                  placeholder="e.g. 12345678"
                  pattern="[0-9]*"
                  autoFocus
                />
                <p className={`text-xs ${
                  paymentRef.length >= 4 && paymentRef.length <= 8
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}>
                  {paymentRef.length}/8 digits
                  {paymentRef.length > 0 && paymentRef.length < 4 && " (minimum 4)"}
                  {paymentRef.length >= 4 && paymentRef.length <= 8 && " — valid"}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>
              Cancel
            </Button>
            <Button onClick={handleCharge} disabled={processing}>
              {processing ? "Processing..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Orders Dialog */}
      <Dialog open={showPending} onOpenChange={setShowPending}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pending Orders</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pendingOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No pending orders
              </p>
            ) : (
              pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div>
                    <p className="font-medium text-sm">
                      #{String(order.order_number).padStart(4, "0")} — {order.items.length} item(s) — ${order.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.table_number
                        ? `Table ${order.table_number}`
                        : "No table"}{" "}
                      · {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => restorePendingOrder(order)}
                  >
                    Restore
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
