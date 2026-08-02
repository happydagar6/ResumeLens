const { Resend } = require("resend");

// Initialize Resend with your API key from .env
const resend = new Resend(process.env.RESEND_API_KEY); // initialize resend

const sendEmail = async (options) => {
    try {
        const { data, error } = await resend.emails.send({
            // IMPORTANT: For testing, use the testing email below. 
            // For production, change this to a domain you have verified in Resend (e.g. hello@yourdomain.com)
            from: process.env.FROM_EMAIL || "onboarding@resend.dev", // from email
            to: options.email, // to email
            subject: options.subject, // subject
            html: options.html, // html
        });

        if (error) { // error handling
            console.error("Resend API Error:", error); // error message
            throw new Error(error.message); // throw error message
        }

        console.log("Email sent successfully:", data); // email sent successfully
        return data; // return data
    } catch (err) {
        console.error("Email sending failed:", err); // error message
        throw err; // throw error message
    }
};

module.exports = sendEmail;