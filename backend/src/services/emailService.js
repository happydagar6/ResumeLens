const { Resend } = require("resend");

// Initialize Resend with your API key from .env
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
    try {
        const { data, error } = await resend.emails.send({
            // IMPORTANT: For testing, use the testing email below. 
            // For production, change this to a domain you have verified in Resend (e.g. hello@yourdomain.com)
            from: process.env.FROM_EMAIL || "onboarding@resend.dev",
            to: options.email,
            subject: options.subject,
            html: options.html,
        });

        if (error) {
            console.error("Resend API Error:", error);
            throw new Error(error.message);
        }

        console.log("Email sent successfully:", data);
        return data;
    } catch (err) {
        console.error("Email sending failed:", err);
        throw err;
    }
};

module.exports = sendEmail;