"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SettingsTab() {
  const [taxRate, setTaxRate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from("settings")
      .select("*")
      .eq("key", "tax_rate")
      .single();
    if (data) setTaxRate(data.value);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveTaxRate = async () => {
    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Tax rate must be between 0 and 100");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("settings")
      .update({ value: rate.toString(), updated_at: new Date().toISOString() })
      .eq("key", "tax_rate");

    if (error) {
      toast.error("Failed to update tax rate");
    } else {
      toast.success(`Tax rate updated to ${rate}%`);
    }
    setSaving(false);
  };

  if (loading) return <p className="text-muted-foreground p-4">Loading...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Settings</h2>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Tax Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tax Rate (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="e.g. 10"
            />
            <p className="text-xs text-muted-foreground">
              Set to 0 to disable tax. Default: 10%
            </p>
          </div>
          <Button onClick={saveTaxRate} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
