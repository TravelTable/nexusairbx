import { Avatar, AvatarFallback } from "../shadcn/avatar";
import { Card, CardContent } from "../shadcn/card";
import { homepageTestimonial } from "../../content/homepageLanding";

const avatarFallbacks = ["AR", "RB", "SL"];

export default function HomepageTestimonial() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6" aria-labelledby="testimonial-heading">
      <Card className="overflow-hidden border-white/10 bg-white/[0.04]">
        <CardContent className="grid gap-8 p-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-center md:p-8">
          <div>
            <h2 id="testimonial-heading" className="text-2xl font-black text-white">
              {homepageTestimonial.heading}
            </h2>
            <div className="mt-5 flex -space-x-3" aria-hidden="true">
              {avatarFallbacks.map((fallback) => (
                <Avatar key={fallback} className="h-12 w-12 border-2 border-[#07090f] bg-cyan-300/10">
                  <AvatarFallback className="bg-cyan-300/10 text-sm font-black text-cyan-100">
                    {fallback}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
          <blockquote>
            <p className="text-2xl font-black leading-snug tracking-tight text-white">
              "{homepageTestimonial.quote}"
            </p>
            <cite className="mt-4 block text-sm font-black not-italic text-zinc-300">
              - {homepageTestimonial.author}
            </cite>
          </blockquote>
        </CardContent>
      </Card>
    </section>
  );
}
