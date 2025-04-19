import { Card, CardContent } from "@/components/ui/card"

interface ArtistCardProps {
  name: string
  imageUrl: string
  followers: string
}

export function ArtistCard({ name, imageUrl, followers }: ArtistCardProps) {
  return (
    <Card className="overflow-hidden group">
      <CardContent className="p-0">
        <div className="relative">
          <img
            src={imageUrl || "/placeholder.svg"}
            alt={name}
            className="w-full aspect-square object-cover rounded-full"
          />
        </div>
        <div className="p-3 text-center">
          <h3 className="font-medium text-sm truncate">{name}</h3>
          <p className="text-xs text-muted-foreground">{followers} followers</p>
        </div>
      </CardContent>
    </Card>
  )
}

