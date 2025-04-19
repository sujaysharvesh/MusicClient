"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Loader2, SkipBack, SkipForward, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react"
import { toast } from "sonner"
import { Slider } from "@/components/ui/slider"

interface Song {
  title: string;
  s3Key: string;
  contentType?: string; 
  contendType?: string; 
  durationSec: number;
  fileSize: number;
  id?: string;
  formattedDuration?: string;
}

interface MusicPlayerProps {
  songId: string;
  songDetails: Song | null;
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  onClose: () => void;
  musicData: Song[];
  setCurrentSong: (songId: string | null) => void;
  formatDuration: (seconds: number) => string;
}

export function MusicPlayer({
  songId,
  songDetails,
  isPlaying,
  setIsPlaying,
  onClose,
  musicData,
  setCurrentSong,
}: MusicPlayerProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoadingSong, setIsLoadingSong] = useState(false)
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const getAuthToken = () => localStorage.getItem('token') || ''
  const formatDuration = (duration: number): string => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  

  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => setDuration(audio.duration)
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    }
    const handleVolumeChange = () => {
      setIsMuted(audio.muted);
      setVolume(audio.volume);
    }
    const handleLoadedData = () => {
      setIsLoadingSong(false);
      if (isPlaying) {
        const playPromise = audio.play()
        playPromise?.catch(() => setIsPlaying(false))
      }
    }
    const handleError = () => {
      setIsLoadingSong(false);
      setIsPlaying(false);
      toast({ title: "Playback Error", description: "Unable to play this song.", variant: "destructive" })
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('volumechange', handleVolumeChange)
    audio.addEventListener('loadeddata', handleLoadedData)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('volumechange', handleVolumeChange)
      audio.removeEventListener('loadeddata', handleLoadedData)
      audio.removeEventListener('error', handleError)
    }
  }, [isPlaying, setIsPlaying])

  useEffect(() => {
    if (!audioRef.current || !audioSrc) return;
    isPlaying ? audioRef.current.play().catch(() => setIsPlaying(false)) : audioRef.current.pause()
  }, [isPlaying, audioSrc])

  useEffect(() => {
    if (!songId) return setAudioSrc(null);
    const prepareSong = async () => {
      try {
        setIsLoadingSong(true);
        const token = getAuthToken()
        const csrfRes = await fetch("http://localhost:8085/api/user/csrf", { credentials: "include" })
        const { token: csrfToken } = await csrfRes.json()

        const res = await fetch(`http://localhost:8085/api/music/stream/${songId}`, {
          headers: { Authorization: `Bearer ${token}`, "X-CSRF-TOKEN": csrfToken, byteRange: "bytes=0-" },
        })

        const blob = await res.blob()
        setAudioSrc(URL.createObjectURL(blob))
      } catch (err) {
        setIsLoadingSong(false);
        setIsPlaying(false);
        toast({ title: "Error", description: "Failed to prepare the song.", variant: "destructive" })
      }
    }
    prepareSong()
  }, [songId, setIsPlaying])

  useEffect(() => {
    if (!audioRef.current || !audioSrc) return;
    audioRef.current.pause()
    audioRef.current.src = audioSrc
    audioRef.current.load()
    return () => audioSrc && URL.revokeObjectURL(audioSrc)
  }, [audioSrc])

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (v: number[]) => {
    const volumeValue = v[0]
    if (!audioRef.current) return;
    audioRef.current.volume = volumeValue
    setVolume(volumeValue)
    if (volumeValue === 0) setIsMuted(true)
    else setIsMuted(false)
  }

  const handleSeek = (v: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = v[0]
      setCurrentTime(v[0])
    }
  }

  const playNextSong = () => {
    const idx = musicData.findIndex(s => s.id === songId)
    if (idx !== -1) {
      const next = musicData[(idx + 1) % musicData.length]
      setCurrentSong(next?.id || null)
      setIsPlaying(true)
    }
  }

  const playPreviousSong = () => {
    const idx = musicData.findIndex(s => s.id === songId)
    if (idx !== -1) {
      const prev = musicData[(idx - 1 + musicData.length) % musicData.length]
      setCurrentSong(prev?.id || null)
      setIsPlaying(true)
    }
  }

  const togglePlayerSize = () => setIsPlayerExpanded(!isPlayerExpanded)

  return (
    <>
      <audio ref={audioRef} preload="auto" />
      <div className={`fixed ${isPlayerExpanded ? 'inset-x-0 bottom-0 top-20 m-4' : 'bottom-4 right-4'} transition-all duration-300 ease-in-out`}>
        <div className={`bg-background border rounded-lg shadow-lg overflow-hidden ${isPlayerExpanded ? 'w-full h-full flex flex-col' : 'w-80'}`}>
          <div className="bg-muted/20 p-3 flex items-center justify-between border-b">
            <div className="font-medium truncate flex-1">{songDetails?.title || "Unknown Song"}</div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlayerSize}>
                {isPlayerExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <Slider value={[currentTime]} max={duration} step={0.1} onValueChange={handleSeek} />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={playPreviousSong}><SkipBack /></Button>
              <Button variant="ghost" size="icon" className="w-12 h-12" disabled={isLoadingSong} onClick={() => setIsPlaying(!isPlaying)}>
                {isLoadingSong ? <Loader2 className="animate-spin" /> : isPlaying ? <Pause /> : <Play />}
              </Button>
              <Button variant="ghost" size="icon" onClick={playNextSong}><SkipForward /></Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleMute}>{isMuted ? <VolumeX /> : <Volume2 />}</Button>
              <Slider value={[volume]} min={0} max={1} step={0.01} onValueChange={handleVolumeChange} className="w-full" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
