"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ChevronLeft, Play, Pause, SkipBack, SkipForward, Volume2, Heart, Shuffle, Repeat } from "lucide-react"
import { usePlayerStore } from "@/lib/CurrentUserSong"
// Sample music data
export function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isShuffleActive, setIsShuffleActive] = useState(false);
  const [isRepeatActive, setIsRepeatActive] = useState(false);

  const currentSong = usePlayerStore((state) => state.currentSong);

  if (!currentSong) return null; // Don't render player if no song selected

  return (
    <div className="h-24 border-t bg-background flex items-center px-6 sticky bottom-0">
      <div className="w-1/4">
        <div>
          <h4 className="text-sm font-medium">{currentSong.title}</h4>
          <p className="text-xs text-muted-foreground">Artist Name</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center">
        <div className="flex items-center space-x-4 mb-2">
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${isShuffleActive ? "text-primary" : ""}`}
            onClick={() => setIsShuffleActive(!isShuffleActive)}
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setIsPlaying(!isPlaying)}
            size="icon"
            className="bg-primary text-primary-foreground h-10 w-10 rounded-full"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${isRepeatActive ? "text-primary" : ""}`}
            onClick={() => setIsRepeatActive(!isRepeatActive)}
          >
            <Repeat className="h-4 w-4" />
          </Button>
        </div>
        <div className="w-full flex items-center space-x-2">
          <span className="text-xs text-muted-foreground w-10 text-right">0:00</span>
          <Slider value={[35]} max={100} step={1} className="flex-1" />
          <span className="text-xs text-muted-foreground w-10">{currentSong.duration}</span>
        </div>
      </div>

      <div className="w-1/4 flex items-center justify-end space-x-4">
        <div className="flex items-center w-32">
          <Volume2 className="h-4 w-4 mr-2" />
          <Slider
            value={[volume]}
            max={100}
            step={1}
            onValueChange={(value) => setVolume(value[0])}
          />
        </div>
      </div>
    </div>
  );
}