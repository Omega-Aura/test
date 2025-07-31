import { usePlayerStore } from "@/stores/usePlayerStore";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface LyricLine {
	time: number;
	text: string;
}

// Helper to parse LRC format
const parseLRC = (lrc: string): LyricLine[] => {
	if (!lrc) return [];

	const lines = lrc.split('\n');
	const parsedLines: LyricLine[] = [];

	const lrcLineRegex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\](.*)/;

	for (const line of lines) {
		const match = line.match(lrcLineRegex);
		if (match) {
			const minutes = parseInt(match[1], 10);
			const seconds = parseInt(match[2], 10);
			const milliseconds = parseInt(match[3], 10);
			const text = match[4].trim();

			const time = minutes * 60 + seconds + milliseconds / 1000;
			if (text) {
				parsedLines.push({ time, text });
			}
		}
	}

	return parsedLines.sort((a, b) => a.time - b.time);
};


const LyricsPanel = () => {
	const { currentSong, showLyrics, toggleLyrics, currentTime } = usePlayerStore();
	const [activeLineIndex, setActiveLineIndex] = useState(-1);
	const activeLineRef = useRef<HTMLParagraphElement>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	const parsedLyrics = useMemo(() => {
		if (currentSong?.lyrics && currentSong.hasLRC) {
			return parseLRC(currentSong.lyrics);
		}
		return [];
	}, [currentSong]);

	// Effect to update active line based on currentTime
	useEffect(() => {
		if (parsedLyrics.length > 0) {
			let newActiveIndex = -1;
			for (let i = 0; i < parsedLyrics.length; i++) {
				if (currentTime >= parsedLyrics[i].time) {
					newActiveIndex = i;
				} else {
					break;
				}
			}
			setActiveLineIndex(newActiveIndex);
		} else {
			setActiveLineIndex(-1);
		}
	}, [currentTime, parsedLyrics]);

	// Effect to scroll to active line
	useEffect(() => {
		if (activeLineIndex !== -1 && activeLineRef.current) {
			activeLineRef.current.scrollIntoView({
				behavior: "smooth",
				block: "center",
			});
		}
	}, [activeLineIndex]);


	const renderLyrics = () => {
		if (!currentSong?.lyrics) {
			return (
				<div className="flex items-center justify-center h-full">
					<p className="text-zinc-400 text-center text-lg">
						Lyrics not available for this song
					</p>
				</div>
			);
		}

		// If LRC is present and parsed
		if (currentSong.hasLRC && parsedLyrics.length > 0) {
			return (
				<div className="space-y-4">
					{parsedLyrics.map((line, index) => (
						<p
							key={index}
							ref={index === activeLineIndex ? activeLineRef : null}
							className={cn(
								"text-2xl leading-relaxed transition-all duration-300",
								index === activeLineIndex
									? "text-white font-bold scale-105"
									: "text-zinc-400 font-medium"
							)}
						>
							{line.text || "\u00A0"}
						</p>
					))}
				</div>
			)
		}

		// Fallback for plain text lyrics
		return currentSong.lyrics.split('\n').map((line, index) => (
			<p key={index} className="text-lg leading-relaxed text-white">
				{line || "\u00A0"}
			</p>
		));
	}

	return (
		<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
			<div className="bg-zinc-900 rounded-lg w-full max-w-2xl h-[70vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-zinc-700">
					<div>
						<h2 className="text-xl font-bold text-white">
							{currentSong?.title || "No song selected"}
						</h2>
						<p className="text-zinc-400">
							{currentSong?.artist || "Unknown artist"}
						</p>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={toggleLyrics}
						className="text-zinc-400 hover:text-white"
					>
						<X className="h-5 w-5" />
					</Button>
				</div>

				{/* Lyrics content */}
				<ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
					{currentSong ? (
						renderLyrics()
					) : (
						<div className="flex items-center justify-center h-full">
							<p className="text-zinc-400 text-center">
								No song is currently playing
							</p>
						</div>
					)}
				</ScrollArea>
			</div>
		</div>
	);
};

export default LyricsPanel;
