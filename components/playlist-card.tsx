import { Card, CardContent } from "@/components/ui/card"
import { Play } from "lucide-react"

interface PlaylistCardProps {
  title: string
  description: string
  imageUrl: string
  songCount: number
}

export function PlaylistCard({ title, description, imageUrl, songCount }: PlaylistCardProps) {
  return (
    <Card className="overflow-hidden group">
      <CardContent className="p-0">
        <div className="relative">
          <img src={imageUrl || "/placeholder.svg"} alt={title} className="w-full aspect-square object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button className="bg-primary text-primary-foreground rounded-full p-3 transform translate-y-4 group-hover:translate-y-0 transition-transform">
              <Play className="h-5 w-5 fill-current" />
            </button>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm truncate">{title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
          <p className="text-xs text-muted-foreground mt-1">{songCount} songs</p>
        </div>
      </CardContent>
    </Card>
  )
}

