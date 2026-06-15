import Nav from "@/components/fizz/Nav";
import Hero from "@/components/fizz/Hero";
import Marquee from "@/components/fizz/landing/Marquee";
import FromTo from "@/components/fizz/FromTo";
import Loop from "@/components/fizz/landing/Loop";
import WhyFizz from "@/components/fizz/WhyFizz";
import Stats from "@/components/fizz/landing/Stats";
import POV from "@/components/fizz/POV";
import Cta from "@/components/fizz/landing/Cta";
import Footer from "@/components/fizz/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <FromTo />
        <Loop />
        <WhyFizz />
        <Stats />
        <POV />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
