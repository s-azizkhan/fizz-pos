import Nav from "@/components/fizz/Nav";
import Hero from "@/components/fizz/Hero";
import FromTo from "@/components/fizz/FromTo";
import POV from "@/components/fizz/POV";
import WhyFizz from "@/components/fizz/WhyFizz";
import WaitlistForm from "@/components/fizz/WaitlistForm";
import Footer from "@/components/fizz/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <FromTo />
        <POV />
        <WhyFizz />

        <section className="border-b border-ink-line">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className="max-w-[20ch] font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
              Stop guessing. Get early access to{" "}
              <span className="text-fizz">Fizz</span>.
            </h2>
            <p className="mt-4 max-w-[55ch] text-lg text-steam">
              We&apos;re onboarding independent cafés now. Drop your email and
              we&apos;ll pour you a spot.
            </p>
            <div className="mt-8 max-w-2xl">
              <WaitlistForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
