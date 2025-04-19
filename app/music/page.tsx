"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MusicList } from "@/components/music-list";
import { MusicPlayer } from "@/components/music-player";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function MusicPage() {
  const [userEmail, setUserEmail] = useState("user@example.com");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        console.log("Token from cookie/localStorage:", token);

        if (!token) {
          router.push("/login");
          return;
        }

        const csrfResponse = await fetch("http://localhost:8085/api/user/csrf", {
          credentials: "include",
        });
        const csrfToken = (await csrfResponse.json()).token;
        if (!csrfToken) {
          throw new Error("Authentication required");
        }
        console.log("Fetching from /api/music/me with token:", token, "and CSRF:", csrfToken);

        const response = await fetch("http://localhost:8085/api/music/me", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "X-CSRF-TOKEN": csrfToken,
            "Content-Type": "application/json"
          },
          credentials: "include"
        });

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        if (!response.ok) {
          console.error("Error fetching user data:", response.statusText);
          throw new Error(`HTTP error! status: ${response.status}, ${await response.text()}`);
        }

        const userData = await response.json();
        setUserEmail(userData.name);
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Music Player</h1>
        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-sm text-muted-foreground">Loading...</span>
          ) : (
            <span className="text-sm text-muted-foreground">{userEmail}</span>
          )}
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
          <Link href="/login">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-auto">
        <MusicList />
      </main>
    </div>
  );
}
