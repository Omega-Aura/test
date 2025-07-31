import mongoose from "mongoose";

const songSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
		},
		artist: {
			type: String,
			required: true,
		},
		imageUrl: {
			type: String,
			required: true,
		},
		audioUrl: {
			type: String,
			required: true,
		},
		duration: {
			type: Number,
			required: true,
		},
		albumId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Album",
			required: false,
		},
		lyrics: {
			type: String,
			required: false,
		},
		language: {
			type: String,
			required: false,
			default: "English",
		},
		releaseDate: {
			type: Date,
			required: false,
			default: Date.now,
		},
	},
	{ timestamps: true }
);

export const Song = mongoose.model("Song", songSchema);
