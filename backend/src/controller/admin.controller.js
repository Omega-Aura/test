import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import cloudinary from "../lib/cloudinary.js";

// helper function for cloudinary uploads
const uploadToCloudinary = async (file) => {
	try {
		const result = await cloudinary.uploader.upload(file.tempFilePath, {
			resource_type: "auto",
		});
		return result.secure_url;
	} catch (error) {
		console.log("Error in uploadToCloudinary", error);
		throw new Error("Error uploading to cloudinary");
	}
};

export const createSong = async (req, res, next) => {
	try {
		if (!req.files || !req.files.audioFile || !req.files.imageFile) {
			return res.status(400).json({ message: "Please upload all files" });
		}

		const { title, artist, albumId, duration, lyrics, language, releaseDate } = req.body;
		const audioFile = req.files.audioFile;
		const imageFile = req.files.imageFile;

		const audioUrl = await uploadToCloudinary(audioFile);
		const imageUrl = await uploadToCloudinary(imageFile);

		const song = new Song({
			title,
			artist,
			audioUrl,
			imageUrl,
			duration,
			albumId: albumId || null,
			lyrics: lyrics || null,
			language: language || "English",
			releaseDate: releaseDate ? new Date(releaseDate) : new Date(),
		});

		await song.save();

		// if song belongs to an album, update the album's songs array
		if (albumId) {
			await Album.findByIdAndUpdate(albumId, {
				$push: { songs: song._id },
			});
		}
		res.status(201).json(song);
	} catch (error) {
		console.log("Error in createSong", error);
		next(error);
	}
};

export const deleteSong = async (req, res, next) => {
	try {
		const { id } = req.params;

		const song = await Song.findById(id);

		// if song belongs to an album, update the album's songs array
		if (song.albumId) {
			await Album.findByIdAndUpdate(song.albumId, {
				$pull: { songs: song._id },
			});
		}

		await Song.findByIdAndDelete(id);

		res.status(200).json({ message: "Song deleted successfully" });
	} catch (error) {
		console.log("Error in deleteSong", error);
		next(error);
	}
};

export const updateSong = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { title, artist, albumId, duration, lyrics, language, releaseDate } = req.body;

		console.log("Updating song with data:", { title, artist, albumId, duration, lyrics, language, releaseDate });

		const song = await Song.findById(id);
		if (!song) {
			return res.status(404).json({ message: "Song not found" });
		}

		// Update fields
		song.title = title || song.title;
		song.artist = artist || song.artist;
		song.duration = duration || song.duration;
		song.lyrics = lyrics !== undefined ? lyrics : song.lyrics;
		song.language = language || song.language;
		if (releaseDate !== undefined) {
			song.releaseDate = releaseDate ? new Date(releaseDate) : new Date();
		}

		// Handle album change
		if (albumId !== undefined) {
			// Remove from old album if it exists
			if (song.albumId) {
				await Album.findByIdAndUpdate(song.albumId, {
					$pull: { songs: song._id },
				});
			}

			// Add to new album if specified
			if (albumId && albumId !== "none") {
				await Album.findByIdAndUpdate(albumId, {
					$push: { songs: song._id },
				});
				song.albumId = albumId;
			} else {
				song.albumId = null;
			}
		}

		// Handle file updates if provided
		if (req.files) {
			if (req.files.audioFile) {
				const audioUrl = await uploadToCloudinary(req.files.audioFile);
				song.audioUrl = audioUrl;
			}
			if (req.files.imageFile) {
				const imageUrl = await uploadToCloudinary(req.files.imageFile);
				song.imageUrl = imageUrl;
			}
		}

		await song.save();

		console.log("Song updated successfully:", { 
			id: song._id, 
			title: song.title, 
			releaseDate: song.releaseDate 
		});

		res.status(200).json(song);
	} catch (error) {
		console.log("Error in updateSong", error);
		next(error);
	}
};

export const createAlbum = async (req, res, next) => {
	try {
		const { title, artist, releaseYear } = req.body;
		const { imageFile } = req.files;

		const imageUrl = await uploadToCloudinary(imageFile);

		const album = new Album({
			title,
			artist,
			imageUrl,
			releaseYear,
		});

		await album.save();

		res.status(201).json(album);
	} catch (error) {
		console.log("Error in createAlbum", error);
		next(error);
	}
};

export const deleteAlbum = async (req, res, next) => {
	try {
		const { id } = req.params;
		await Song.deleteMany({ albumId: id });
		await Album.findByIdAndDelete(id);
		res.status(200).json({ message: "Album deleted successfully" });
	} catch (error) {
		console.log("Error in deleteAlbum", error);
		next(error);
	}
};

export const checkAdmin = async (req, res, next) => {
	res.status(200).json({ admin: true });
};
