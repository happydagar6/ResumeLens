// create-test-pdf.js
// Generates a valid text-based PDF resume for pipeline testing.
// Run: node create-test-pdf.js
// Output: test-resume.pdf (in the backend folder)

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const outputPath = path.join(__dirname, "test-resume.pdf");
const doc = new PDFDocument({ margin: 50 });

doc.pipe(fs.createWriteStream(outputPath));

// ── Header ──────────────────────────────────────────────────────────────────
doc.fontSize(20).font("Helvetica-Bold").text("John Doe", { align: "center" });
doc.fontSize(12).font("Helvetica").text("Senior React Developer", { align: "center" });
doc.fontSize(10).text("john.doe@example.com | +1-555-0100 | San Francisco, CA", { align: "center" });
doc.moveDown();

// ── Summary ──────────────────────────────────────────────────────────────────
doc.fontSize(13).font("Helvetica-Bold").text("PROFESSIONAL SUMMARY");
doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
doc.moveDown(0.3);
doc.fontSize(10).font("Helvetica").text(
    "Experienced Senior React Developer with 6 years of hands-on experience building scalable " +
    "web applications. Deep expertise in React.js, TypeScript, Node.js, and GraphQL. " +
    "Strong background in AWS cloud services and Docker containerization."
);
doc.moveDown();

// ── Skills ───────────────────────────────────────────────────────────────────
doc.fontSize(13).font("Helvetica-Bold").text("SKILLS");
doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
doc.moveDown(0.3);
doc.fontSize(10).font("Helvetica");
const skills = [
    "Languages: JavaScript, TypeScript, Python",
    "Frontend: React.js, Next.js, Redux, HTML5, CSS3, Tailwind CSS",
    "Backend: Node.js, Express.js, GraphQL, REST APIs",
    "Databases: MongoDB, PostgreSQL, Redis",
    "Cloud & DevOps: AWS (EC2, S3, Lambda), Docker, Kubernetes, CI/CD, Jenkins",
    "Testing: Jest, React Testing Library, Cypress",
    "Tools: Git, GitHub, Jira, Figma",
];
skills.forEach((s) => doc.text(`• ${s}`));
doc.moveDown();

// ── Work Experience ───────────────────────────────────────────────────────────
doc.fontSize(13).font("Helvetica-Bold").text("WORK EXPERIENCE");
doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
doc.moveDown(0.3);
doc.fontSize(11).font("Helvetica-Bold").text("Senior React Developer — TechStartup Inc.");
doc.fontSize(10).font("Helvetica").text("January 2022 – Present");
const exp1 = [
    "Led frontend architecture for a SaaS platform serving 50,000+ users",
    "Migrated legacy jQuery codebase to React.js, reducing load time by 40%",
    "Implemented GraphQL API layer with Apollo Client",
    "Mentored team of 4 junior developers",
    "Set up CI/CD pipeline using GitHub Actions and Docker",
];
exp1.forEach((e) => doc.text(`  • ${e}`));
doc.moveDown(0.5);

doc.fontSize(11).font("Helvetica-Bold").text("React Developer — WebAgency Co.");
doc.fontSize(10).font("Helvetica").text("March 2019 – December 2021");
const exp2 = [
    "Built 15+ client-facing React applications",
    "Integrated AWS services including S3, Lambda, and CloudFront",
    "Developed reusable component library adopted by entire team",
    "Worked in agile environment with 2-week sprints",
];
exp2.forEach((e) => doc.text(`  • ${e}`));
doc.moveDown(0.5);

doc.fontSize(11).font("Helvetica-Bold").text("Junior Frontend Developer — Digital Solutions Ltd.");
doc.fontSize(10).font("Helvetica").text("June 2018 – February 2019");
doc.text("  • Developed responsive web interfaces using React and TypeScript");
doc.text("  • Wrote unit tests with Jest achieving 85% code coverage");
doc.moveDown();

// ── Education ─────────────────────────────────────────────────────────────────
doc.fontSize(13).font("Helvetica-Bold").text("EDUCATION");
doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
doc.moveDown(0.3);
doc.fontSize(11).font("Helvetica-Bold").text("Bachelor of Science in Computer Science");
doc.fontSize(10).font("Helvetica").text("University of California, Berkeley — 2018");
doc.moveDown();

// ── Certifications ────────────────────────────────────────────────────────────
doc.fontSize(13).font("Helvetica-Bold").text("CERTIFICATIONS");
doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
doc.moveDown(0.3);
doc.fontSize(10).font("Helvetica");
doc.text("• AWS Certified Developer - Associate (2023)");
doc.text("• MongoDB Certified Developer (2022)");
doc.moveDown();

doc.end();

doc.on("finish", () => {
    const size = (fs.statSync(outputPath).size / 1024).toFixed(1);
    console.log(`✅ Test resume PDF created: ${outputPath}`);
    console.log(`   Size: ${size} KB — properly formatted, text-parseable PDF`);
    console.log("\nNow run: node test-pipeline.js");
});

doc.on("error", (err) => {
    console.error("❌ Failed to create PDF:", err.message);
});
