export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-gradient-to-br from-primary via-[#7C74FF] to-secondary shadow-[0_8px_16px_rgba(108,99,255,0.28)]">
        <span className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white/30" />
        <span className="absolute -bottom-3 -left-2 h-7 w-7 rounded-full bg-accent/70" />
        <span className="relative font-display text-[1.35rem] italic leading-none text-white">S</span>
      </span>
      <span className="font-display text-[1.7rem] leading-none tracking-[-0.03em] text-ink">
        Styl<span className="text-primary">io</span>
      </span>
    </span>
  );
}
