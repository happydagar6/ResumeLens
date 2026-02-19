import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Brain, MessageSquareText, BarChart3 } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Smart Resume Parsing",
    description:
      "Upload PDF resumes and our AI automatically extracts skills, experience, education, and contact details.",
  },
  {
    icon: Brain,
    title: "AI-Powered Screening",
    description:
      "Score candidates against job descriptions with detailed matched skills, strengths, and recommendations.",
  },
  {
    icon: MessageSquareText,
    title: "Interview Questions",
    description:
      "Generate personalized interview questions tailored to each candidate's profile and skill gaps.",
  },
  {
    icon: BarChart3,
    title: "Ranked Results",
    description:
      "View all candidates ranked by match score with clear recommendations to make hiring decisions faster.",
  },
];

export default function Features() {
  return (
    <section className="py-20 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">
            Everything you need to hire smarter
          </h2>
          <p className="mt-3 text-muted-foreground">
            Streamline your recruitment pipeline from resume upload to interview prep.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border bg-card hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
