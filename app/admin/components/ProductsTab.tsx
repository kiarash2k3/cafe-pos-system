"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ProductForm {
  name: string;
  price: string;
  cost: string;
  category: string;
  stock_quantity: string;
  low_stock_threshold: string;
  is_active: boolean;
}

const emptyForm: ProductForm = {
  name: "",
  price: "",
  cost: "",
  category: "Coffee",
  stock_quantity: "100",
  low_stock_threshold: "10",
  is_active: true,
};

export default function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const supabase = createClient();

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("category")
      .order("name");
    if (data) setProducts(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (product: Product) => {
    setEditId(product.id);
    setForm({
      name: product.name,
      price: product.price.toString(),
      cost: product.cost.toString(),
      category: product.category,
      stock_quantity: product.stock_quantity.toString(),
      low_stock_threshold: product.low_stock_threshold.toString(),
      is_active: product.is_active,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    const data = {
      name: form.name,
      price: parseFloat(form.price),
      cost: parseFloat(form.cost),
      category: form.category,
      stock_quantity: parseInt(form.stock_quantity),
      low_stock_threshold: parseInt(form.low_stock_threshold),
      is_active: form.is_active,
    };

    if (editId) {
      const { error } = await supabase
        .from("products")
        .update(data)
        .eq("id", editId);
      if (error) {
        toast.error("Failed to update product");
        return;
      }
      toast.success("Product updated");
    } else {
      const { error } = await supabase.from("products").insert(data);
      if (error) {
        toast.error("Failed to create product");
        return;
      }
      toast.success("Product created");
    }

    setShowDialog(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete product");
      return;
    }
    toast.success("Product deleted");
    fetchProducts();
  };

  const toggleActive = async (product: Product) => {
    const { error } = await supabase
      .from("products")
      .update({ is_active: !product.is_active })
      .eq("id", product.id);
    if (error) {
      toast.error("Failed to toggle product");
      return;
    }
    fetchProducts();
  };

  if (loading) return <p className="text-muted-foreground p-4">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Products</h2>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Product
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell>{p.category}</TableCell>
              <TableCell className="text-right">
                ${p.price.toFixed(2)}
              </TableCell>
              <TableCell className="text-right">
                ${p.cost.toFixed(2)}
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={
                    p.stock_quantity <= p.low_stock_threshold
                      ? "text-destructive font-medium"
                      : ""
                  }
                >
                  {p.stock_quantity}
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={p.is_active ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => toggleActive(p)}
                >
                  {p.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(p.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) =>
                    setForm({ ...form, cost: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stock Quantity</Label>
                <Input
                  type="number"
                  value={form.stock_quantity}
                  onChange={(e) =>
                    setForm({ ...form, stock_quantity: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Low Stock Threshold</Label>
                <Input
                  type="number"
                  value={form.low_stock_threshold}
                  onChange={(e) =>
                    setForm({ ...form, low_stock_threshold: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
