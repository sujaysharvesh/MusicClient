import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Home, Search, Library, PlusCircle, Heart, Download, Clock } from "lucide-react"

export function Sidebar() {
  return (
    <div className="w-64 bg-card border-r flex flex-col h-full">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Melodify</h1>
        <nav className="space-y-2">
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/search">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/library">
              <Library className="mr-2 h-4 w-4" />
              Your Library
            </Link>
          </Button>
        </nav>
      </div>
      <Separator />
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" className="text-xs">
            <PlusCircle className="mr-1 h-4 w-4" />
            Create Playlist
          </Button>
          <Button variant="ghost" size="sm" className="text-xs">
            <Heart className="mr-1 h-4 w-4" />
            Liked Songs
          </Button>
        </div>
        <Separator className="my-4" />
        <ScrollArea className="h-[300px]">
          <div className="space-y-1">
            {[
              "Chill Mix",
              "Workout Playlist",
              "Road Trip Vibes",
              "Study Session",
              "Party Mix",
              "Acoustic Favorites",
              "Morning Coffee",
              "Evening Wind Down",
              "Running Tracks",
              "Coding Focus",
            ].map((playlist) => (
              <Button key={playlist} variant="ghost" size="sm" className="w-full justify-start text-sm font-normal">
                {playlist}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="mt-auto p-6">
        <Button variant="ghost" size="sm" className="w-full justify-start mb-2">
          <Download className="mr-2 h-4 w-4" />
          Install App
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Clock className="mr-2 h-4 w-4" />
          Recently Played
        </Button>
      </div>
    </div>
  )
}

