import { usePlayerStore } from "@/stores/usePlayerStore";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Helper function to format lyrics into lines
const formatLyrics = (lyrics: string): string[] => {
	if (!lyrics || !lyrics.trim()) return [];
	return lyrics.split('\n').filter(line => line.trim() !== '');
};

const LyricsPanel = () => {
	const { currentSong, showLyrics, toggleLyrics } = usePlayerStore();

	if (!showLyrics) return null;

	const lyrics = currentSong?.lyrics ? formatLyrics(currentSong.lyrics) : null;

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
				<ScrollArea className="flex-1 p-6">
					{currentSong ? (
						<div className="space-y-4">
							{lyrics ? (
								lyrics.map((line: string, index: number) => (
									<p
										key={index}
										className="text-lg leading-relaxed text-white"
									>
										{line || "\u00A0"}
									</p>
								))
							) : (
								<div className="flex items-center justify-center h-full">
									<p className="text-zinc-400 text-center text-lg">
										Lyrics not available for this song
									</p>
								</div>
							)}
						</div>
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
