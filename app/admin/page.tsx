import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import AdminDashboard from "./components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
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
  if (profile.role !== "admin" && profile.role !== "manager") {
    redirect("/cashier");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile} />
      <AdminDashboard profile={profile} />
    </div>
  );
}
