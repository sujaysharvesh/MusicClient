"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Play, Pause, Clock, Trash2, AlertCircle, Volume2, VolumeX, Loader2, SkipBack, SkipForward, Maximize2, Minimize2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Slider } from "@/components/ui/slider"
import { usePlayerStore } from "@/lib/CurrentUserSong"

// Interface for the song data structure from API
interface Song {
  title: string;
  s3Key: string;
  contentType?: string; // Fixed from API response which shows "contendType"
  contendType?: string; // Added for API compatibility
  durationSec: number;
  fileSize: number;
  id?: string; // UUID as string
  formattedDuration?: string;
}

export function MusicList() {
  const router = useRouter()
  const [musicData, setMusicData] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSong, setCurrentSong] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [songToDelete, setSongToDelete] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoadingSong, setIsLoadingSong] = useState(false)
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  // Add a state to control the player popup visibility
  const [showPlayerPopup, setShowPlayerPopup] = useState(false)
  // Add state for expanded/minimized player view
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false)

  const { setCurrentUserSong } = usePlayerStore()
  
  // Audio element reference
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  const getAuthToken = () => {
    return localStorage.getItem('token') || '';
  }

  // Fetch music data from API
  useEffect(() => {
    const fetchMusicData = async () => {
      try {
        const token = localStorage.getItem("token");
        console.log("Token from localStorage:", token);

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
        
        setIsLoading(true)
        const response = await fetch('http://localhost:8085/api/music/songs', {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "X-CSRF-TOKEN": csrfToken,
            "Content-Type": "application/json"
          },
          credentials: "include"
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Process song data and ensure each item has a unique ID
        const songsWithIds = data.map((song: Song, index: number) => ({
          ...song,
          // Convert contendType to contentType if needed
          contentType: song.contentType || song.contendType,
          // If the song doesn't have an ID, use the index as a fallback
          id: song.id || `song-${index}`, 
          // Format duration from seconds to MM:SS if available
          formattedDuration: song.durationSec ? formatDuration(song.durationSec) : "Unknown"
        }))
        
        setMusicData(songsWithIds)
        setError(null)
      } catch (err) {
        console.error("Error fetching music data:", err)
        setError("Failed to load your music. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchMusicData()
  }, [router])

  // Set up audio event listeners only once
  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleDurationChange = () => {
      setDuration(audio.duration);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    
    const handleVolumeChange = () => {
      setIsMuted(audio.muted);
      setVolume(audio.volume);
    };
    
    const handleLoadedData = () => {
      console.log("Audio data loaded");
      setIsLoadingSong(false);
      // Only auto-play if we intended to play
      if (isPlaying) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Playback failed after load:", error);
            setIsPlaying(false);
          });
        }
      }
    };
    
    const handleError = (e: Event) => {
      // Use a more resilient error handling approach
      const errorEvent = e as ErrorEvent; 
      console.error("Audio error occurred:", errorEvent.message || "Unknown error");
      setIsLoadingSong(false);
      setIsPlaying(false);
      toast({
        title: "Playback Error",
        description: "Unable to play this song. Please try again.",
        variant: "destructive"
      });
    };
    
    // Add event listeners
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('error', handleError);
    
    // Remove event listeners on cleanup
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('error', handleError);
    };
  }, [isPlaying]); // Re-attach if isPlaying changes

  // Play/pause toggling effect
  useEffect(() => {
    if (!audioRef.current || !audioSrc) return;
    
    if (isPlaying) {
      // Only attempt to play if we have a source and audio is ready
      if (audioRef.current.readyState >= 2) { // HAVE_CURRENT_DATA or higher
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Playback failed:", error);
            setIsPlaying(false);
            toast({
              title: "Playback Error",
              description: "Unable to play this song. Please try again.",
              variant: "destructive"
            });
          });
        }
      }
    } else {
      // Always safe to pause
      audioRef.current.pause();
    }
  }, [isPlaying, audioSrc]);

  // Setup audio source when currentSong changes
  useEffect(() => {
    if (!currentSong) {
      setAudioSrc(null);
      setShowPlayerPopup(false); // Hide player when no song is selected
      return;
    }
    
    // Show player popup when a song is selected
    setShowPlayerPopup(true);
    
    const prepareSongForPlayback = async () => {
      try {
        setIsLoadingSong(true);
        
        const token = getAuthToken();
        if (!token) {
          router.push('/login');
          return;
        }
        
        // Get CSRF token
        const csrfResponse = await fetch("http://localhost:8085/api/user/csrf", {
          credentials: "include",
        });
        const csrfData = await csrfResponse.json();
        const csrfToken = csrfData.token;
        
        if (!csrfToken) {
          throw new Error("Authentication required");
        }
        
        // Create audio source URL
        const respone =  fetch(`http://localhost:8085/api/music/stream/${currentSong}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "X-CSRF-TOKEN": csrfToken,
            "byteRange": "bytes=0-",
          }
        });
        const blob = (await respone).blob();
        const src = URL.createObjectURL(await blob);
        setAudioSrc(src);
        
        // Reset any previous errors
        setError(null);
      } catch (error) {
        console.error("Error preparing song:", error);
        setIsLoadingSong(false);
        setIsPlaying(false);
        toast({
          title: "Error",
          description: "Failed to prepare the song for playback. Please try again.",
          variant: "destructive"
        });
      }
    };
    
    prepareSongForPlayback();
  }, [currentSong, router]);
  
  // Apply audio source to the audio element when it changes
  useEffect(() => {
    if (!audioRef.current || !audioSrc) return;
    
    // Stop any current playback first
    audioRef.current.pause();
    
    // Set new source and load it
    audioRef.current.src = audioSrc;
    audioRef.current.load();
    
    // Audio will play after loaded, via the loadeddata event
  }, [audioSrc]);

  // Helper function to format duration from seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    if (!seconds) return "Unknown"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Format file size to a human-readable format
  const formatFileSize = (bytes: number): string => {
    if (!bytes) return "Unknown"
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  // Get filename from s3Key path
  const getFilenameFromPath = (path: string): string => {
    const parts = path.split('/')
    return parts[parts.length - 1].split('.')[0]
  }

  const handlePlayPause = (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigation when clicking play/pause
    
    if (currentSong === id) {
      // If already selected, just toggle play state
      setIsPlaying(!isPlaying)
    } else {
      // If selecting a new song, set it and prepare to play
      setCurrentSong(id)
      // We'll set isPlaying to true, but actual playback will happen after loading
      setIsPlaying(true)
    }
  }

  const handleDeleteSong = (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigation when clicking delete
    setSongToDelete(id)
  }

  const confirmDelete = async () => {
    if (songToDelete !== null) {
      try {
        setIsDeleting(true)
        
        const token = getAuthToken();
        if (!token) {
          router.push('/login');
          return;
        }
        
        // Get CSRF token
        const csrfResponse = await fetch("http://localhost:8085/api/user/csrf", {
          credentials: "include",
        });
        const csrfData = await csrfResponse.json();
        const csrfToken = csrfData.token;
        
        if (!csrfToken) {
          throw new Error("Authentication required");
        }
        
        // Call the delete API endpoint
        const response = await fetch(`http://localhost:8085/api/music/delete/${songToDelete}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-CSRF-TOKEN': csrfToken,
            'Content-Type': 'application/json'
          },
          credentials: "include"
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || `Error ${response.status}: Failed to delete song`)
        }
        
        // Remove the song from the list
        setMusicData(musicData.filter((song) => song.id !== songToDelete))

        // If the current playing song is deleted, reset the player
        if (currentSong === songToDelete) {
          setCurrentSong(null)
          setIsPlaying(false)
          setAudioSrc(null)
        }
        
        // Show success toast
        toast({
          title: "Song Deleted",
          description: "The song has been removed from your library.",
        })
      } catch (err) {
        console.error("Error deleting song:", err)
        toast({
          title: "Delete Failed",
          description: err instanceof Error ? err.message : "Unable to delete song. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsDeleting(false)
        setSongToDelete(null) // Reset the song to delete
      }
    }
  }

  const cancelDelete = () => {
    setSongToDelete(null)
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (newVolume: number[]) => {
    if (audioRef.current) {
      const volumeValue = newVolume[0];
      audioRef.current.volume = volumeValue;
      setVolume(volumeValue);
      
      // If volume is set to 0, mute the audio
      if (volumeValue === 0) {
        audioRef.current.muted = true;
        setIsMuted(true);
      } else if (isMuted) {
        // If volume is increased from 0, unmute
        audioRef.current.muted = false;
        setIsMuted(false);
      }
    }
  }

  const handleSeek = (newTime: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime[0];
      setCurrentTime(newTime[0]);
    }
  }
  
  const handlePlay = (song: Song) => {
    setCurrentUserSong({
      id: song.id,
      title: song.title,
      duration: formatDuration(song.durationSec),
    });
  };

  const playNextSong = () => {
    if (!currentSong || musicData.length === 0) return;
    
    const currentIndex = musicData.findIndex(song => song.id === currentSong);
    if (currentIndex === -1) return;
    
    const nextIndex = (currentIndex + 1) % musicData.length;
    const nextSong = musicData[nextIndex];
    
    if (nextSong && nextSong.id) {
      setCurrentSong(nextSong.id);
      setIsPlaying(true);
    }
  }

  const playPreviousSong = () => {
    if (!currentSong || musicData.length === 0) return;
    
    const currentIndex = musicData.findIndex(song => song.id === currentSong);
    if (currentIndex === -1) return;
    
    const prevIndex = (currentIndex - 1 + musicData.length) % musicData.length;
    const prevSong = musicData[prevIndex];
    
    if (prevSong && prevSong.id) {
      setCurrentSong(prevSong.id);
      setIsPlaying(true);
    }
  }

  // This function will be used for the "View Details" button
  // rather than clicking on the whole row
  const navigateToSongDetail = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any other click handlers
    router.push(`/music/song/${song.id}`);
  }

  // Function to close the player popup
  const closePlayer = () => {
    setShowPlayerPopup(false);
    setCurrentSong(null);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }

  // Toggle expanded/minimized player
  const togglePlayerSize = () => {
    setIsPlayerExpanded(!isPlayerExpanded);
  }

  // Get current song details
  const currentSongDetails = currentSong ? musicData.find(song => song.id === currentSong) : null;

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-destructive font-medium">{error}</p>
        <Button 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Hidden audio element for playback */}
      <audio 
        ref={audioRef}
        preload="auto"
      />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Your Music</h2>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">{musicData.length} songs</div>
          <Button size="sm" className="gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-upload"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            Upload
          </Button>
        </div>
      </div>

      {musicData.length === 0 ? (
        <div className="text-center py-12 border rounded-md bg-muted/10">
          <p className="text-muted-foreground mb-2">You don't have any songs yet</p>
          <Button size="sm" className="gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-upload"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            Upload Music
          </Button>
        </div>
      ) : (
        <div className="border rounded-md">
          <div className="grid grid-cols-9 gap-4 px-4 py-2 bg-muted/50 text-sm font-medium">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Title</div>
            <div className="col-span-1 flex justify-end">
              <Clock className="h-4 w-4" />
            </div>
            <div className="col-span-2"></div> {/* Column for actions */}
          </div>

          <div className="divide-y">
            {musicData.map((song, index) => {
              // Ensure each item has a unique key
              const key = song.id || `song-${index}`;
              return (
                <div
                  key={key}
                  className={`grid grid-cols-9 gap-4 px-4 py-3 items-center hover:bg-muted/50 group ${
                    currentSong === song.id ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="col-span-1 flex items-center">
                    {currentSong === song.id ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={(e) => song.id && handlePlayPause(song.id, e)}
                      >
                        {isLoadingSong ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : isPlaying ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                    ) : (
                      <div className="flex items-center">
                        <span className="text-muted-foreground mr-2">{index + 1}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100"
                          onClick={(e) => song.id && handlePlayPause(song.id, e)}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="col-span-5 truncate font-medium">
                    {song.title || getFilenameFromPath(song.s3Key)}
                  </div>
                  <div className="col-span-1 text-right text-muted-foreground">
                    {song.durationSec ? formatDuration(song.durationSec) : "--:--"}
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    {/* View Details Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground"
                      onClick={(e) => song.id && navigateToSongDetail(song, e)}
                    >
                      View Details
                    </Button>
                    
                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={(e) => song.id && handleDeleteSong(song.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pop-up Player (shows only when a song is selected and showPlayerPopup is true) */}
      {showPlayerPopup && currentSong && (
        <div className={`fixed ${isPlayerExpanded ? 'inset-x-0 bottom-0 top-20 m-4' : 'bottom-4 right-4'} transition-all duration-300 ease-in-out`}>
          <div 
            className={`bg-background border rounded-lg shadow-lg overflow-hidden ${
              isPlayerExpanded ? 'w-full h-full flex flex-col' : 'w-80'
            }`}
          >
            {/* Player header */}
            <div className="bg-muted/20 p-3 flex items-center justify-between border-b">
              <div className="font-medium truncate flex-1">
                {currentSongDetails?.title || "Unknown Song"}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={togglePlayerSize}
                >
                  {isPlayerExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={closePlayer}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-x"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </Button>
              </div>
            </div>
            
            {/* Player content */}
            <div className={`p-4 ${isPlayerExpanded ? 'flex-1 flex flex-col' : ''}`}>
              {/* Song info and album art placeholder - only in expanded view */}
              {isPlayerExpanded && (
                <div className="flex-1 flex flex-col items-center justify-center mb-4">
                  <div className="w-48 h-48 bg-muted/30 rounded-lg flex items-center justify-center mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-music text-muted-foreground/50"
                    >
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <div className="text-lg font-semibold text-center">
                    {currentSongDetails?.title || "Unknown Song"}
                  </div>
                </div>
              )}
              
              {/* Progress bar */}
              <div className="w-full mb-3">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <div>{formatDuration(currentTime)}</div>
                  <div>{formatDuration(duration)}</div>
                </div>
              </div>
              
              {/* Playback controls */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={playPreviousSong}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="default" 
                  size="icon" 
                  className="h-10 w-10 rounded-full" 
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={isLoadingSong}
                >
                  {isLoadingSong ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={playNextSong}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Volume control */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={toggleMute}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                
                <div className="flex-1">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Dialog for Delete */}
      <AlertDialog open={songToDelete !== null} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Remove Song
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this song from your library? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}