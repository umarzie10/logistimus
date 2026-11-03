import { Button } from "@/components/marketing/ui/Button";

export function CTASection() {
  return (
    <section id="get-started" className="relative overflow-hidden bg-midnight py-24 text-ice lg:py-32">
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 500"
        fill="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <circle cx="720" cy="250" r="360" stroke="#2D4C8B" strokeWidth="1" opacity="0.55" />
        <circle cx="720" cy="250" r="500" stroke="#2D4C8B" strokeWidth="1" opacity="0.3" />
        <line x1="0" y1="250" x2="1440" y2="250" stroke="#2D4C8B" strokeWidth="1" opacity="0.35" />
      </svg>

      <div className="container-page relative mx-auto max-w-3xl text-center">
        <p className="type-label text-powder">Get started</p>
        <h2 className="type-display mt-6">
          Take control of your
          <br />
          <span className="text-powder">logistics.</span>
        </h2>
        <p className="type-body mx-auto mt-6 text-blue-200">
          Bring your entire logistics operation into one connected platform.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button variant="light" href="/sign-up">
            Get Started
            <span aria-hidden="true">→</span>
          </Button>
          <Button variant="outlineLight" href="/portal">
            Talk to Our Team
          </Button>
        </div>
      </div>
    </section>
  );
}
