import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
    variable: "--font-geist-sans",
    subsets: ["latin"],
    display: "swap",
});

export const metadata = {
    title: "RecruitAI — Intelligent Resume Screening Platform",
    description:
        "AI-powered recruitment platform that screens resumes, scores candidates, and generates personalized interview questions.",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={`${inter.variable} antialiased`}>
                {children}
            </body>
        </html>
    );
}
