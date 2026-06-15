"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { ROLES } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface UsersTabProps {
  isAdmin: boolean;
}

export default function UsersTab({ isAdmin }: UsersTabProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");
    if (data) setProfiles(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to update role");
      return;
    }
    toast.success("Role updated");
    fetchProfiles();
  };

  if (loading) return <p className="text-muted-foreground p-4">Loading...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Users</h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            {isAdmin && <TableHead>Change Role</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.full_name}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    p.role === "admin"
                      ? "default"
                      : p.role === "manager"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {p.role}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(p.created_at).toLocaleDateString()}
              </TableCell>
              {isAdmin && (
                <TableCell>
                  <Select
                    value={p.role}
                    onValueChange={(v) => updateRole(p.id, v)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
