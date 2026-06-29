import { Separator } from "../shadcn/separator";
import { homepageFooterLinks } from "../../content/homepageLanding";

export default function HomepageFooter() {
  return (
    <footer className="mt-8 border-t border-white/10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-7 sm:px-6 md:flex-row md:items-center md:justify-between">
        <a className="inline-flex items-center gap-2 font-black text-white" href="/" aria-label="NexusRBX home">
          <img className="h-7 w-7 rounded-md object-contain" src="/logo.png" alt="" width="28" height="28" />
          <span>NexusRBX.com</span>
        </a>
        <nav className="flex flex-wrap gap-2 text-sm font-bold text-zinc-300" aria-label="Footer">
          {homepageFooterLinks.map((link) => (
            <a className="rounded-lg px-3 py-2 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
      <Separator className="mx-auto max-w-6xl bg-white/10" />
      <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs font-semibold text-zinc-500 sm:px-6">
        NexusRBX.com, not affiliated with Roblox Corporation.
      </p>
    </footer>
  );
}
