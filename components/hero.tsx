import Image from "next/image";

export function Hero() {
  return (
    <div className="flex flex-col gap-16 items-center">
      <div className="text-center space-y-6">
        <div className="flex justify-center mb-6">
          <Image
            src="/pea-logo.png"
            alt="Patient Engagement Award"
            width={340}
            height={180}
            className="h-auto w-auto"
            priority
          />
        </div>
        <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold">
          <span className="pea-hero-text">
            Patient Engagement Award
          </span>
        </h1>
        <h2 className="text-2xl lg:text-3xl font-semibold text-muted-foreground">
          Piattaforma di Votazione
        </h2>
      </div>
      <p className="text-xl lg:text-2xl !leading-tight mx-auto max-w-3xl text-center text-muted-foreground">
        Partecipa alla valutazione delle migliori iniziative di engagement del paziente. 
        La tua voce conta per riconoscere l&apos;eccellenza nell&apos;assistenza sanitaria.
      </p>
      <div className="w-full max-w-2xl mx-auto">
        <div className="h-1 pea-gradient rounded-full" />
      </div>
    </div>
  );
}