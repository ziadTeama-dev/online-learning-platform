import { google } from "googleapis";
import fs from "fs/promises";
import { createReadStream } from "fs";

const requiredEnv = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI", "GOOGLE_REFRESH_TOKEN"];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
    // Do not log secret values. Upload calls will fail clearly when credentials are absent.
    console.warn(`YouTube integration is not configured (${missing.join(", ")})`);
}

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const youtube = google.youtube({ version: "v3", auth: oauth2Client });

export const uploadVideoToYouTube = async ({ filePath, title, description = "", privacyStatus = "private" }) => {
    try {
        if (privacyStatus !== "private") throw new Error("Uploads must remain private");
        const response = await youtube.videos.insert({
            part: "snippet,status",
            requestBody: {
                snippet: { title, description },
                status: { privacyStatus: "private", selfDeclaredMadeForKids: false }
            },
            media: { body: createReadStream(filePath) }
        });

        if (!response.data.id) throw new Error("YouTube did not return a video ID");
        return { success: true, videoId: response.data.id, url: `https://www.youtube.com/watch?v=${response.data.id}` };
    } finally {
        try { await fs.unlink(filePath); } catch { /* cleanup is best effort */ }
    }
};
