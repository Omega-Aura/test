import { create } from "zustand";
import { Song } from "@/types";
import { useChatStore } from "./useChatStore";
import { playerService } from "@/services/playerService";
import toast from "react-hot-toast";

interface PlayerStore {
	currentSong: Song | null;
	isPlaying: boolean;
	queue: Song[];
	currentIndex: number;
	showLyrics: boolean;
	showQueue: boolean;
	showRecent: boolean;
	recentSongs: Song[];
	shuffle: boolean;
	loop: 'off' | 'one' | 'all';
	volume: number;
	isMuted: boolean;
	previousVolume: number;
	currentTime: number;

	initializeQueue: (songs: Song[]) => void;
	playAlbum: (songs: Song[], startIndex?: number) => void;
	setCurrentSong: (song: Song | null) => void;
	setCurrentTime: (time: number) => void;
	togglePlay: () => void;
	playNext: () => void;
	playPrevious: () => void;
	toggleLyrics: () => void;
	toggleQueue: () => Promise<void>;
	toggleRecent: () => void;
	toggleShuffle: () => Promise<void>;
	toggleLoop: () => Promise<void>;
	loadPlayerSettings: () => Promise<void>;
	setVolume: (volume: number) => Promise<void>;
	toggleMute: () => void;
	removeFromQueue: (index: number) => void;
	reorderQueue: (fromIndex: number, toIndex: number) => void;
	clearQueue: () => void;
	addToRecent: (songId: string) => Promise<void>;
	loadRecentSongs: () => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
	currentSong: null,
	isPlaying: false,
	queue: [],
	currentIndex: -1,
	showLyrics: false,
	showQueue: false,
	showRecent: false,
	recentSongs: [],
	shuffle: false,
	loop: 'off',
	volume: 75,
	isMuted: false,
	previousVolume: 75,
	currentTime: 0,

	initializeQueue: (songs: Song[]) => {
		set({
			queue: songs,
			currentSong: get().currentSong || songs[0],
			currentIndex: get().currentIndex === -1 ? 0 : get().currentIndex,
		});
	},

	playAlbum: (songs: Song[], startIndex = 0) => {
		if (songs.length === 0) return;

		const song = songs[startIndex];
		console.log('playAlbum called with song:', song.title, 'startIndex:', startIndex);

		set({
			queue: songs,
			currentIndex: startIndex,
		});

		// Use setCurrentSong to ensure recent tracking works
		get().setCurrentSong(song);
	},

	setCurrentSong: (song: Song | null) => {
		if (!song) return;

		console.log('setCurrentSong called with song:', song.title, 'ID:', song._id);

		const socket = useChatStore.getState().socket;
		if (socket.auth) {
			socket.emit("update_activity", {
				userId: socket.auth.userId,
				activity: `Playing ${song.title} by ${song.artist}`,
			});
		}

		const songIndex = get().queue.findIndex((s) => s._id === song._id);
		set({
			currentSong: song,
			isPlaying: true,
			currentIndex: songIndex !== -1 ? songIndex : get().currentIndex,
		});

		// Add song to recent songs
		if (song._id) {
			console.log('Adding song to recent from setCurrentSong:', song._id);
			get().addToRecent(song._id);
		} else {
			console.log('Song has no _id, cannot add to recent');
		}
	},

	setCurrentTime: (time) => set({ currentTime: time }),

	togglePlay: () => {
		const willStartPlaying = !get().isPlaying;

		const currentSong = get().currentSong;
		const socket = useChatStore.getState().socket;
		if (socket.auth) {
			socket.emit("update_activity", {
				userId: socket.auth.userId,
				activity:
					willStartPlaying && currentSong ? `Playing ${currentSong.title} by ${currentSong.artist}` : "Idle",
			});
		}

		set({
			isPlaying: willStartPlaying,
		});
	},

	playNext: () => {
		const { currentIndex, queue, shuffle, loop } = get();
		let nextIndex: number;

		// Handle loop one - repeat current song
		if (loop === 'one') {
			nextIndex = currentIndex;
		} else if (shuffle) {
			// Shuffle mode: play random song
			nextIndex = Math.floor(Math.random() * queue.length);
		} else {
			// Normal mode: play next song
			nextIndex = currentIndex + 1;
		}

		// Handle end of queue (only applies when not in 'one' loop mode)
		if (nextIndex >= queue.length && loop !== 'one') {
			if (loop === 'all') {
				// Loop all mode: restart from beginning
				nextIndex = 0;
			} else {
				// No loop: stop playing
				set({ isPlaying: false });
				const socket = useChatStore.getState().socket;
				if (socket.auth) {
					socket.emit("update_activity", {
						userId: socket.auth.userId,
						activity: `Idle`,
					});
				}
				return;
			}
		}

		// Play the next song
		if (nextIndex < queue.length) {
			const nextSong = queue[nextIndex];

			set({ currentIndex: nextIndex });
			get().setCurrentSong(nextSong);
		}
	},
	playPrevious: () => {
		const { currentIndex, queue } = get();
		const prevIndex = currentIndex - 1;

		// theres a prev song
		if (prevIndex >= 0) {
			const prevSong = queue[prevIndex];

			set({ currentIndex: prevIndex });
			get().setCurrentSong(prevSong);
		} else {
			// no prev song
			set({ isPlaying: false });

			const socket = useChatStore.getState().socket;
			if (socket.auth) {
				socket.emit("update_activity", {
					userId: socket.auth.userId,
					activity: `Idle`,
				});
			}
		}
	},

	toggleLyrics: () => {
		set({
			showLyrics: !get().showLyrics,
		});
	},

	loadPlayerSettings: async () => {
		try {
			const settings = await playerService.getPlayerState();
			set({
				shuffle: settings.shuffle,
				loop: settings.loop,
				volume: settings.volume,
				showQueue: settings.showQueue,
				isMuted: settings.volume === 0,
				previousVolume: settings.volume > 0 ? settings.volume : 75
			});

			// Apply volume to audio element if it exists
			const audio = document.querySelector("audio") as HTMLAudioElement;
			if (audio) {
				audio.volume = settings.volume / 100;
			}
		} catch (error) {
			console.error("Failed to load player settings:", error);
		}
	},

	toggleShuffle: async () => {
		try {
			const response = await playerService.toggleShuffle();
			set({ shuffle: response.shuffle });
			toast.success(response.message);
		} catch (error: any) {
			console.error("Shuffle toggle full error:", error);
			console.error("Error response:", error.response?.data);
			toast.error(error.response?.data?.message || "Failed to toggle shuffle");
		}
	},

	toggleLoop: async () => {
		try {
			const response = await playerService.toggleLoop();
			set({ loop: response.loop });
			toast.success(response.message);
		} catch (error: any) {
			console.error("Loop toggle full error:", error);
			console.error("Error response:", error.response?.data);
			toast.error(error.response?.data?.message || "Failed to toggle loop");
		}
	},

	setVolume: async (newVolume: number) => {
		try {
			// Update volume in backend
			await playerService.setVolume(newVolume);

			// Update local state
			set({
				volume: newVolume,
				isMuted: newVolume === 0,
				previousVolume: newVolume > 0 ? newVolume : get().previousVolume
			});

			// Apply volume to audio element if it exists
			const audio = document.querySelector("audio") as HTMLAudioElement;
			if (audio) {
				audio.volume = newVolume / 100;
			}
		} catch (error: any) {
			console.error("Volume set error:", error);
			toast.error("Failed to set volume");
		}
	},

	toggleMute: () => {
		const { volume, isMuted, previousVolume } = get();

		if (isMuted) {
			// Unmute: restore previous volume
			const restoreVolume = previousVolume > 0 ? previousVolume : 75;
			get().setVolume(restoreVolume);
		} else {
			// Mute: set volume to 0 but remember current volume
			set({
				previousVolume: volume > 0 ? volume : previousVolume,
				volume: 0,
				isMuted: true
			});

			// Apply mute to audio element if it exists
			const audio = document.querySelector("audio") as HTMLAudioElement;
			if (audio) {
				audio.volume = 0;
			}

			// Save mute state to backend
			playerService.setVolume(0).catch((error: any) => {
				console.error("Failed to save mute state:", error);
			});
		}
	},

	toggleQueue: async () => {
		try {
			const response = await playerService.toggleQueue();
			set({ showQueue: response.showQueue });
			toast.success(response.message);
		} catch (error: any) {
			console.error("Queue toggle error:", error);
			toast.error("Failed to toggle queue");
		}
	},

	removeFromQueue: (index: number) => {
		const { queue, currentIndex } = get();
		if (index < 0 || index >= queue.length) return;

		const newQueue = [...queue];
		newQueue.splice(index, 1);

		let newCurrentIndex = currentIndex;
		if (index < currentIndex) {
			newCurrentIndex = currentIndex - 1;
		} else if (index === currentIndex) {
			// If removing current song, adjust index but keep playing
			newCurrentIndex = Math.min(currentIndex, newQueue.length - 1);
		}

		set({
			queue: newQueue,
			currentIndex: newCurrentIndex,
			currentSong: newQueue[newCurrentIndex] || null
		});
	},

	reorderQueue: (fromIndex: number, toIndex: number) => {
		const { queue, currentIndex } = get();
		if (fromIndex === toIndex) return;

		const newQueue = [...queue];
		const [movedItem] = newQueue.splice(fromIndex, 1);
		newQueue.splice(toIndex, 0, movedItem);

		// Adjust current index if needed
		let newCurrentIndex = currentIndex;
		if (fromIndex === currentIndex) {
			newCurrentIndex = toIndex;
		} else if (fromIndex < currentIndex && toIndex >= currentIndex) {
			newCurrentIndex = currentIndex - 1;
		} else if (fromIndex > currentIndex && toIndex <= currentIndex) {
			newCurrentIndex = currentIndex + 1;
		}

		set({
			queue: newQueue,
			currentIndex: newCurrentIndex
		});
	},

	clearQueue: () => {
		set({
			queue: [],
			currentIndex: -1,
			currentSong: null,
			isPlaying: false
		});
	},

	toggleRecent: () => {
		const { showRecent } = get();
		set({ showRecent: !showRecent });

		// Load recent songs when opening recent panel
		if (!showRecent) {
			get().loadRecentSongs();
		}
	},

	addToRecent: async (songId: string) => {
		try {
			console.log('Adding song to recent:', songId);
			await playerService.addToRecent(songId);
			// Optionally reload recent songs to get updated list
			get().loadRecentSongs();
		} catch (error) {
			console.error('Failed to add song to recent:', error);
		}
	},

	loadRecentSongs: async () => {
		try {
			console.log('Loading recent songs...');
			const recentSongs = await playerService.getRecentSongs();
			console.log('Loaded recent songs:', recentSongs);
			set({ recentSongs });
		} catch (error) {
			console.error('Failed to load recent songs:', error);
			set({ recentSongs: [] });
		}
	},
}));
