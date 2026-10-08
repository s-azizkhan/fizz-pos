import Nav from "@/components/fizz/Nav";
import Hero from "@/components/fizz/Hero";
import Marquee from "@/components/fizz/landing/Marquee";
import Pain from "@/components/fizz/landing/Pain";
import LeakCalc from "@/components/fizz/landing/LeakCalc";
import Remedy from "@/components/fizz/landing/Remedy";
import Loop from "@/components/fizz/landing/Loop";
import WhyFizz from "@/components/fizz/WhyFizz";
import Compare from "@/components/fizz/landing/Compare";
import Fit from "@/components/fizz/landing/Fit";
import Faq from "@/components/fizz/landing/Faq";
import Cta from "@/components/fizz/landing/Cta";
import Footer from "@/components/fizz/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Pain />
        <LeakCalc />
        <Remedy />
        <Loop />
        <WhyFizz />
        <Compare />
        <Fit />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
