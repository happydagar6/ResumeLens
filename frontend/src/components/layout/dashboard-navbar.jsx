"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BrainCircuit, LogOut, LayoutDashboard, Sparkles } from "lucide-react";
import NotificationBell from "@/components/dashboard/notification-bell";

export default function DashboardNavbar() {
  const { user, logout } = useAuth();

  return (
    <div className="flex items-center gap-3">
      <Link href="/" className="flex items-center gap-2 mr-auto">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-600 shadow-md shadow-primary/30">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold gradient-brand hidden sm:inline">RecruitAI</span>
      </Link>

      {user && <NotificationBell />}

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <Avatar className="h-9 w-9 ring-2 ring-primary/30 ring-offset-1">
                <AvatarFallback className="bg-gradient-to-br from-primary to-violet-600 text-white text-sm font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-border/60 shadow-xl shadow-primary/10">
            <div className="px-2 py-2">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              {user.role && (
                <span className="mt-1.5 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold capitalize text-primary border border-primary/20">
                  {user.role.replace("_", " ")}
                </span>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard" className="cursor-pointer">
                <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
