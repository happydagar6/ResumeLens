const cloudinary = require("cloudinary").v2;

// You will get these credentials for free when you sign up at cloudinary.com
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extracts public_id from Cloudinary secure_url and deletes the file.
 * Expected URL format: https://res.cloudinary.com/.../raw/upload/v.../recruitai_resumes/filename.pdf
 */
async function deleteFromCloudinary(secureUrl) {
    if (!secureUrl || !secureUrl.includes("cloudinary.com")) return;
    
    try {
        // Find the index of "recruitai_resumes" (our folder)
        const folderIndex = secureUrl.indexOf("recruitai_resumes/");
        if (folderIndex === -1) return;
        
        // Extract the path starting from the folder.
        // For raw files (PDFs), the public_id includes the file extension.
        const publicId = secureUrl.substring(folderIndex);
        
        // Destroy requires resource_type: "raw" since we uploaded it as raw
        await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
        console.log(`[Cloudinary] Deleted file: ${publicId}`);
    } catch (err) {
        console.error("[Cloudinary] Failed to delete file:", err.message);
    }
}

module.exports = { cloudinary, deleteFromCloudinary };
