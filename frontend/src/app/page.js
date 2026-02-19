import Navbar from "@/components/layout/navbar";
import Hero from "@/components/sections/hero";
import Features from "@/components/sections/features";
import Footer from "@/components/layout/footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
