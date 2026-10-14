const { Resend } = require("resend");

// Initialize Resend with your API key from .env
const resend = new Resend(process.env.RESEND_API_KEY); // initialize resend

const sendEmail = async (options) => {
    try {
        const formattedHtml = options.html ||
        `<div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333;">
                ${(options.body || options.text || "").replace(/\n/g, "<br />")}
            </div>`;

        const { data, error } = await resend.emails.send({
            from: process.env.FROM_EMAIL || "onboarding@resend.dev",
            to:options.email,
            subject:options.subject,
            html:formattedHtml,
            text: options.body || options.text || "",
        });

        if (error) {
            console.error("Resend API Error:", error);
            throw new Error(error.message);
        }

        console.log("Email sent successfully", data);
        return data;
    } catch (error) {
        console.error("Email sending failed:", error);
        throw error;
    }
};

module.exports = sendEmail;