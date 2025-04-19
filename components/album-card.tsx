import { Card, CardContent } from "@/components/ui/card"
import { Play } from "lucide-react"

interface AlbumCardProps {
  title: string
  artist: string
  coverUrl: string
}

export function AlbumCard({ title, artist, coverUrl }: AlbumCardProps) {
  return (
    <Card className="overflow-hidden group">
      <CardContent className="p-0">
        <div className="relative">
          <img
            src={coverUrl || "/placeholder.svg"}
            alt={`${title} by ${artist}`}
            className="w-full aspect-square object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button className="bg-primary text-primary-foreground rounded-full p-3 transform translate-y-4 group-hover:translate-y-0 transition-transform">
              <Play className="h-5 w-5 fill-current" />
            </button>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm truncate">{title}</h3>
          <p className="text-xs text-muted-foreground truncate">{artist}</p>
        </div>
      </CardContent>
    </Card>
  )
}

