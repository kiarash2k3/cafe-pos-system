"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductsTab from "./ProductsTab";
import UsersTab from "./UsersTab";
import OrdersTab from "./OrdersTab";
import ReportsTab from "./ReportsTab";
import SettingsTab from "./SettingsTab";
import { Profile } from "@/lib/types";

interface AdminDashboardProps {
  profile: Profile;
}

export default function AdminDashboard({ profile }: AdminDashboardProps) {
  return (
    <div className="flex-1 p-6">
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          {profile.role === "admin" && (
            <TabsTrigger value="settings">Settings</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab isAdmin={profile.role === "admin"} />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
        {profile.role === "admin" && (
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
