export function Hero() {
  return (
    <div className="flex flex-col gap-16 items-center">
      <h1 className="text-4xl lg:text-5xl font-bold text-center">Piattaforma di Votazione - Patient Engagement Award</h1>
      <p className="text-xl lg:text-2xl !leading-tight mx-auto max-w-2xl text-center">
        Vota per le iniziative di engagement del paziente
      </p>
      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
    </div>
  );
}