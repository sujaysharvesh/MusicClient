"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MusicList } from "@/components/music-list";
import { MusicPlayer } from "@/components/music-player";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { set } from "react-hook-form";
import * as dotenv from 'dotenv';
dotenv.config();

export default function MusicPage() {
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const getCSTFToken = async () => {
    const csrfResponse = await fetch(`${baseUrl}/api/user/csrf `, {
      credentials: "include",
    })

    if(!csrfResponse) {
      throw new Error("Failed to fetch CSRF token");
    }
    const csrfData = await csrfResponse.json();
    return csrfData.token;
  }
  // Handle OAuth redirect with token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
  
    if (tokenFromUrl) {
      localStorage.setItem("token", tokenFromUrl);
      console.log("Token stored from URL:", tokenFromUrl);
  
      toast({
        title: "Login Success",
        description: "You're now logged in with Google",
      });
  
      // Remove token from URL
      window.history.replaceState({}, document.title, "/music");
      
      // Set authenticated to trigger the data fetch
      setAuthenticated(true);
    } else {
      // Check if we have a token in storage
      const existingToken = localStorage.getItem("token");
      if (existingToken) {
        setAuthenticated(true);
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  // Fetch user data and music list after authentication is confirmed
  useEffect(() => {
    if (!authenticated) return;
    
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        console.log("Using token for API calls:", token);

        if (!token) {
          router.push("/login");
          return;
        }

        const csrfToken = await getCSTFToken();
        const response = await fetch(`${baseUrl}/api/user/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-CSRF-TOKEN": csrfToken,
            "Content-Type": "application/json"
          },
          credentials: "include",
        });

        if (response.status === 401) {
          console.error("Authentication failed - 401 response");
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }

        if (!response.ok) {
          console.error("Error fetching user data:", response.status, response.statusText);
          const errorText = await response.text();
          console.error("Error details:", errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const userData = await response.json();
        setUserName(userData.name || userData.email);
        setLoading(false);
      } catch (error) {
        console.error("Fetch error:", error);
        toast({
          title: "Error",
          description: "Failed to load user data. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    fetchUserData();
  }, [authenticated, router]);

  const handleLogout = async () => {

    try{
      const csrfToken = await getCSTFToken();
      const logoutRespones = await fetch(`${baseUrl}/api/user/logout`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
          "X-CSRF-TOKEN": csrfToken,
          "Content-Type": "application/json"
        }
      })
      if(!logoutRespones.ok){
        throw new Error("Failed to logout");
      }
      localStorage.removeItem("token");
      setAuthenticated(false);
    router.push("/login");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Error",
        description: "An error occurred while logging out. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
      <header className="border-b p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Music Player</h1>
        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-sm text-muted-foreground">Loading...</span>
          ) : (
            <span className="text-sm text-muted-foreground">{userName}</span>
          )}
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
          <Button 
            onClick={handleLogout}
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-auto">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <MusicList />
        </div>
      </main>
    </div>
  );
}