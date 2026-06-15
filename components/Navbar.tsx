"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Coffee, LogOut } from "lucide-react";
import { Profile } from "@/lib/types";

interface NavbarProps {
  profile: Profile;
}

export default function Navbar({ profile }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="border-b bg-background">
      <div className="flex h-14 items-center px-4 gap-4">
        <Coffee className="h-6 w-6" />
        <span className="font-semibold text-lg">Cafe POS</span>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {profile.full_name} ({profile.role})
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
