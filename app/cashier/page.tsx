import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProductGrid from "@/components/ProductGrid";
import Cart from "@/components/Cart";

export const dynamic = "force-dynamic";

export default async function CashierPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("name");

  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("key", "tax_rate")
    .single();

  const taxRate = settings ? parseFloat(settings.value) : 10;

  return (
    <div className="h-screen flex flex-col">
      <Navbar profile={profile} />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto">
          <ProductGrid products={products || []} />
        </div>
        <div className="w-96 border-l p-4 flex flex-col">
          <Cart cashierId={user.id} taxRate={taxRate} />
        </div>
      </div>
    </div>
  );
}
