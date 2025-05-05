"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Clock,
  Trash2,
  AlertCircle,
  Volume2,
  VolumeX,
  Loader2,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  X,
  Music,
  Shuffle,
  Search,
  Loader,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import * as dotenv from 'dotenv';
dotenv.config();

// Interface for the song data structure from API
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

export function MusicList() {
  const router = useRouter();
  const [musicData, setMusicData] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSong, setCurrentSong] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [songToDelete, setSongToDelete] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [showPlayerPopup, setShowPlayerPopup] = useState(false);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Upload related states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Audio element reference
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const getAuthToken = () => {
    return localStorage.getItem("token") || "";
  };

  // Fetch music data from API
  const fetchMusicData = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/login");
        return;
      }

      const csrfResponse = await fetch(`${baseUrl}/api/user/csrf`, {
        credentials: "include",
      });
      const csrfToken = (await csrfResponse.json()).token;
      if (!csrfToken) {
        throw new Error("Authentication required");
      }

      setIsLoading(true);
      const response = await fetch(`${baseUrl}/api/music/songs`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "X-CSRF-TOKEN": csrfToken,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      // Process song data and ensure each item has a unique ID
      const songsWithIds = data.map((song: Song, index: number) => ({
        ...song,
        contentType: song.contentType || song.contendType,
        id: song.id || `song-${index}`,
        formattedDuration: song.durationSec
          ? formatDuration(song.durationSec)
          : "Unknown",
      }));

      setMusicData(songsWithIds);
      setError(null);
    } catch (err) {
      console.error("Error fetching music data:", err);
      setError("Failed to load your music. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMusicData();
  }, [router]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  
  const getFilenameFromPath = (path: string): string => {
    if (!path) return "Unknown"; 
    const parts = path.split("/");
    return parts[parts.length - 1].split(".")[0];
  };

  // Filter music based on search query
  const filteredMusicData = searchQuery
    ? musicData.filter(
        (song) =>
          song.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          getFilenameFromPath(song.s3Key)
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      )
    : musicData;

  // Play a random song from the library
  const playRandomSongFromLibrary = () => {
    if (musicData.length === 0) return;

    const randomIndex = Math.floor(Math.random() * musicData.length);
    const randomSong = musicData[randomIndex];

    if (randomSong && randomSong.id) {
      setCurrentSong(randomSong.id);
      setIsPlaying(true);
      setShowPlayerPopup(true);
      setIsShuffleEnabled(true);

      toast.success("Playing random songs from your library");
    }
  };

  // Play a random song
  const playRandomSong = () => {
    if (!musicData.length) return;
    let availableSongs = musicData.filter((song) => song.id !== currentSong);

    if (availableSongs.length === 0) {
      availableSongs = musicData;
    }

    const randomIndex = Math.floor(Math.random() * availableSongs.length);
    const randomSong = availableSongs[randomIndex];
    if (randomSong && randomSong.id) {
      setCurrentSong(randomSong.id);
      setIsPlaying(true);
    }
  };

  // Set up audio event listeners
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
      if (isShuffleEnabled) {
        playRandomSong();
      } else {
        if (!currentSong || musicData.length === 0) return;

        const currentIndex = musicData.findIndex(
          (song) => song.id === currentSong
        );
        if (currentIndex === -1) return;

        const nextIndex = (currentIndex + 1) % musicData.length;
        const nextSong = musicData[nextIndex];

        if (nextSong && nextSong.id) {
          setCurrentSong(nextSong.id);
          setIsPlaying(true);
        }
      }
    };

    const handleVolumeChange = () => {
      setIsMuted(audio.muted);
      setVolume(audio.volume);
    };

    const handleLoadedData = () => {
      setIsLoadingSong(false);

      if (isPlaying) {
        setTimeout(() => {
          if (audioRef.current && isPlaying) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch((error) => {
                console.error("Playback failed after load:", error);
                setIsPlaying(false);
                toast.error(
                  "Playback Error: Unable to play this song. Please try again."
                );
              });
            }
          }
        }, 50);
      }
    };

    const handleError = (e: Event) => {
      const errorEvent = e as ErrorEvent;
      console.error("Audio error:", errorEvent.message || "Unknown error");
      setIsLoadingSong(false);
      setIsPlaying(false);
      toast.error(
        "Playback Error: Unable to play this song. Please try again."
      );
    };

    // Add event listeners
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("volumechange", handleVolumeChange);
    audio.addEventListener("loadeddata", handleLoadedData);
    audio.addEventListener("error", handleError);

    // Remove event listeners on cleanup
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("volumechange", handleVolumeChange);
      audio.removeEventListener("loadeddata", handleLoadedData);
      audio.removeEventListener("error", handleError);
    };
  }, [isPlaying, isShuffleEnabled, currentSong, musicData]);

  // Set up audio source when audioSrc changes
  useEffect(() => {
    if (!audioRef.current || !audioSrc) return;

    // Stop any current playback first
    audioRef.current.pause();

    // Set new source
    audioRef.current.src = audioSrc;

    // Force loading of new media
    audioRef.current.load();
  }, [audioSrc]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!audioRef.current || !audioSrc) return;

    if (isPlaying) {
      // Only attempt to play if audio is ready
      if (audioRef.current.readyState >= 2) {
        const playPromise = audioRef.current.play();

        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.error("Playback failed:", error);
            setIsPlaying(false);
            toast.error("Unable to play this song. Please try again.");
          });
        }
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, audioSrc]);

  // Setup audio source when currentSong changes
  useEffect(() => {
    if (!currentSong) {
      setAudioSrc(null);
      setShowPlayerPopup(false);
      return;
    }

    // Show player popup when a song is selected
    setShowPlayerPopup(true);

    const prepareSongForPlayback = async () => {
      try {
        setIsLoadingSong(true);
    
        const token = getAuthToken();
        if (!token) {
          router.push("/login");
          return;
        }
    
        // Get CSRF token
        const csrfResponse = await fetch(
          `${baseUrl}/api/user/csrf`,
          {
            credentials: "include",
          }
        );
        const csrfData = await csrfResponse.json();
        const csrfToken = csrfData.token;
    
        if (!csrfToken) {
          throw new Error("Authentication required");
        }
    
        // Create audio source URL with proper headers for streaming
        const response = await fetch(
          `${baseUrl}/api/music/stream/${currentSong}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              Authorization: `Bearer ${token}`,
              "X-CSRF-TOKEN": csrfToken,
              // Don't send byteRange header here - use Range instead
              Range: "bytes=0-",
            },
          }
        );
    
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
    
        const blob = await response.blob();
        const src = URL.createObjectURL(blob);
    
        if (audioSrc) {
          URL.revokeObjectURL(audioSrc);
        }
    
        setAudioSrc(src);
        setIsLoadingSong(false);
        setError(null);
      } catch (error) {
        console.error("Error preparing song:", error);
        setIsLoadingSong(false);
        setIsPlaying(false);
        toast.error(
          `Failed to prepare the song for playback: ${error.message || "Unknown error"}`
        );
      }
    };

    prepareSongForPlayback();
    return () => {
      if (audioSrc) {
        URL.revokeObjectURL(audioSrc);
      }
    };
  }, [currentSong, router]);

  // Helper function to format duration from seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    if (!seconds) return "Unknown";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Format file size to a human-readable format
  const formatFileSize = (bytes: number): string => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  const handlePlayPause = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (currentSong === id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(id);
      setIsPlaying(true);
    }
  };

  const handleDeleteSong = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSongToDelete(id);
  };

  const confirmDelete = async () => {
    if (songToDelete !== null) {
      try {
        setIsDeleting(true);

        const token = getAuthToken();
        if (!token) {
          router.push("/login");
          return;
        }

        // Get CSRF token
        const csrfResponse = await fetch(
          `${baseUrl}/api/user/csrf`,
          {
            credentials: "include",
          }
        );
        const csrfData = await csrfResponse.json();
        const csrfToken = csrfData.token;

        if (!csrfToken) {
          throw new Error("Authentication required");
        }

        // Call the delete API endpoint
        const response = await fetch(
          `${baseUrl}/api/music/delete/${songToDelete}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "X-CSRF-TOKEN": csrfToken,
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message ||
              `Error ${response.status}: Failed to delete song`
          );
        }

        // Remove the song from the list
        setMusicData(musicData.filter((song) => song.id !== songToDelete));

        // If the current playing song is deleted, reset the player
        if (currentSong === songToDelete) {
          setCurrentSong(null);
          setIsPlaying(false);
          setAudioSrc(null);
        }

        toast.success("The song has been removed from your library.");
      } catch (err) {
        console.error("Error deleting song:", err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Unable to delete song. Please try again."
        );
      } finally {
        setIsDeleting(false);
        setSongToDelete(null);
      }
    }
  };

  const cancelDelete = () => {
    setSongToDelete(null);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    if (audioRef.current) {
      const volumeValue = newVolume[0];
      audioRef.current.volume = volumeValue;
      setVolume(volumeValue);

      if (volumeValue === 0) {
        audioRef.current.muted = true;
        setIsMuted(true);
      } else if (isMuted) {
        audioRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  const handleSeek = (newTime: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime[0];
      setCurrentTime(newTime[0]);
    }
  };

  const playNextSong = () => {
    if (!currentSong || musicData.length === 0) return;
    if (isShuffleEnabled) {
      playRandomSong();
    } else {
      const currentIndex = musicData.findIndex(
        (song) => song.id === currentSong
      );
      if (currentIndex === -1) return;

      const nextIndex = (currentIndex + 1) % musicData.length;
      const nextSong = musicData[nextIndex];

      if (nextSong && nextSong.id) {
        setCurrentSong(nextSong.id);
        setIsPlaying(true);
      }
    }
  };

  const playPreviousSong = () => {
    if (!currentSong || musicData.length === 0) return;

    const currentIndex = musicData.findIndex((song) => song.id === currentSong);
    if (currentIndex === -1) return;

    const prevIndex = (currentIndex - 1 + musicData.length) % musicData.length;
    const prevSong = musicData[prevIndex];

    if (prevSong && prevSong.id) {
      setCurrentSong(prevSong.id);
      setIsPlaying(true);
    }
  };

  // Function to close the player popup
  const closePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }

    if (audioSrc) {
      URL.revokeObjectURL(audioSrc);
      setAudioSrc(null);
    }

    setShowPlayerPopup(false);
    setIsPlaying(false);
    setCurrentSong(null);
  };

  // Toggle expanded/minimized player
  const togglePlayerSize = () => {
    setIsPlayerExpanded(!isPlayerExpanded);
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    if (!isLoading) {
      setIsModalOpen(false);
      setSelectedFiles([]);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).filter((file) =>
        file.type.startsWith("audio/")
      );
      setSelectedFiles(filesArray);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("audio/")
      );
      setSelectedFiles(filesArray);
    }
  };

  const removeFile = (index) => {
    const updatedFiles = [...selectedFiles];
    updatedFiles.splice(index, 1);
    setSelectedFiles(updatedFiles);
  };

  const handleUpload = async () => {
    if (selectedFiles.length > 0) {
      setIsLoading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append("files", file);
        });

        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev < 90) {
              return prev + Math.floor(Math.random() * 5);
            }
            return prev;
          });
        }, 200);

        const csrfResponse = await fetch(
          `${baseUrl}/api/user/csrf`,
          {
            credentials: "include",
          }
        );
        const csrfToken = (await csrfResponse.json()).token;
        if (!csrfToken) {
          throw new Error("Authentication required");
        }

        const response = await fetch(`${baseUrl}/api/music/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
            "X-CSRF-TOKEN": csrfToken,
          },
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(95);

        if (!response.ok) {
          throw new Error(
            `Server responded with ${response.status}: ${response.statusText}`
          );
        }

        setUploadProgress(100);
        await response.json();

        setIsLoading(false);
        closeModal();
        fetchMusicData();

        setTimeout(() => {
          toast.success(
            `${selectedFiles.length} music file(s) uploaded successfully!`
          );
        }, 500);
      } catch (error) {
        setIsLoading(false);
        toast.error(`Upload error: ${error.message}`);
      }
    }
  };

  // Get current song details
  const currentSongDetails = currentSong
    ? musicData.find((song) => song.id === currentSong)
    : null;

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-destructive font-medium">{error}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} preload="auto" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-8 gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Your Music</h2>
          <div className="text-sm text-muted-foreground">
            {musicData.length} songs
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {showSearch ? (
            <div className="relative w-full sm:w-64">
              <Input
                type="text"
                placeholder="Search songs..."
                value={searchQuery}
                onChange={handleSearch}
                className="pr-8"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => {
                  setSearchQuery("");
                  setShowSearch(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setShowSearch(true)}
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={playRandomSongFromLibrary}
            disabled={musicData.length === 0}
          >
            <Shuffle className="h-4 w-4" />
            <span className="hidden sm:inline">Random</span>
          </Button>

          <Button size="sm" className="gap-1" onClick={openModal}>
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
            <span className="hidden sm:inline">Upload</span>
          </Button>
        </div>
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md md:max-w-2xl p-4 md:p-6 relative">
            <button
              className={`absolute top-2 right-2 md:top-4 md:right-4 text-gray-500 ${
                isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:text-gray-700"
              }`}
              onClick={closeModal}
              disabled={isLoading}
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold mb-4 md:mb-6">Upload Music</h2>

            {/* Drag & Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-4 md:p-8 text-center cursor-pointer ${
                isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
              } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isLoading && fileInputRef.current.click()}
            >
              <Music className="mx-auto text-gray-400 mb-2 md:mb-4" size={36} />
              <p className="text-base md:text-lg font-medium text-gray-700 mb-1 md:mb-2">
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} file(s) selected`
                  : "Drag and drop music files"}
              </p>
              <p className="text-gray-500 mb-2 md:mb-4">
                {selectedFiles.length === 0 && "or click to browse"}
              </p>
              <p className="text-xs text-gray-400">MP3, WAV, FLAC, AAC</p>
              <input
                type="file"
                multiple
                accept="audio/*"
                className="hidden"
                onChange={handleFileChange}
                ref={fileInputRef}
                disabled={isLoading}
              />
            </div>

            {/* File List */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 md:mt-6">
                <h3 className="text-lg font-medium mb-2 md:mb-3">
                  Selected Files
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 md:p-4 max-h-48 md:max-h-60 overflow-y-auto">
                  <ul className="space-y-2 md:space-y-3">
                    {selectedFiles.map((file, index) => (
                      <li
                        key={index}
                        className="flex justify-between items-center bg-white dark:bg-gray-600 p-2 md:p-3 rounded-md shadow-sm"
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          <Music
                            size={16}
                            className="text-blue-500 mr-2 md:mr-3 flex-shrink-0"
                          />
                          <div className="truncate">
                            <p className="text-sm font-medium truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-300">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        {!isLoading && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                            }}
                            className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {isLoading && (
              <div className="mt-4 md:mt-6">
                <div className="flex justify-between text-sm mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 md:mt-6 flex justify-end gap-2 md:gap-3">
              <Button
                variant="outline"
                disabled={isLoading}
                onClick={closeModal}
                size="sm"
                className="px-3 py-1"
              >
                Cancel
              </Button>
              <Button
                disabled={selectedFiles.length === 0 || isLoading}
                onClick={handleUpload}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload Music"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {musicData.length === 0 ? (
        <div className="text-center py-12 border rounded-md bg-muted/10">
          <p className="text-muted-foreground mb-2">
            You don't have any songs yet
          </p>
          <Button size="sm" className="gap-2" onClick={openModal}>
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
                        <span className="text-muted-foreground mr-2">
                          {index + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100"
                          onClick={(e) =>
                            song.id && handlePlayPause(song.id, e)
                          }
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
                    {song.durationSec
                      ? formatDuration(song.durationSec)
                      : "--:--"}
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
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
        <div
          className={`fixed ${
            isPlayerExpanded
              ? "inset-x-0 bottom-0 top-20 m-4"
              : "flex-1 flex flex-col items-center justify-center mb-4 bottom-4 inset-x-0 "
          } transition-all duration-300 ease-in-out`}
        >
          <div
            className={`bg-background border rounded-lg shadow-lg overflow-hidden mx-auto ${
              isPlayerExpanded
                ? "w-full h-full flex flex-col"
                : "w-full max-w-md"
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
                  {isPlayerExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
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
            <div
              className={`p-4 ${
                isPlayerExpanded ? "flex-1 flex flex-col" : ""
              }`}
            >
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
                {/* Shuffle button */}
                <Button
                  variant={isShuffleEnabled ? "default" : "ghost"}
                  size="icon"
                  className={`h-8 w-8 ${
                    isShuffleEnabled ? "text-primary-foreground bg-primary" : ""
                  }`}
                  onClick={() => setIsShuffleEnabled(!isShuffleEnabled)}
                  title="Shuffle"
                >
                  <Shuffle className="h-4 w-4" />
                </Button>

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
              <div className="flex right-0 items-center gap-2 w-32">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>

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
      )}
      {/* Confirmation Dialog for Delete */}
      <AlertDialog
        open={songToDelete !== null}
        onOpenChange={(open) => !open && cancelDelete()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Remove Song
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this song from your library? This
              action cannot be undone.
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
  );
}
