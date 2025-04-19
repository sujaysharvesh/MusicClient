import { create } from "zustand";

interface PlayerState {
    currentSong: {
        id: string,
        title: string,
        duration: string,
    } | null
    setCurrentUserSong: (song: PlayerState["currentSong"]) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
    currentSong: null,
    setCurrentUserSong: (song) => set({ currentSong: song }),
  }))