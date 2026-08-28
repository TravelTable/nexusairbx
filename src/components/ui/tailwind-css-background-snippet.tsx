import { cn } from "../../lib/utils";

export const Hero = () => {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden")}
    >
      {/* Background Pattern */}
      <div
        className="absolute inset-0 h-full w-full"
        style={{
          background: "radial-gradient(125% 125% at 50% 10%, #000 40%, #63e 100%)",
        }}
      />
    </div>
  );
};

export const HeroDemo = () => {
  return <Hero />;
};

export default Hero;
