import Image from "next/image";
import { BRAND } from "@/lib/brand";

type BrandLogoProps = {
  label?: string;
  showTagline?: boolean;
  className?: string;
  markClassName?: string;
  textClassName?: string;
  taglineClassName?: string;
};

export default function BrandLogo({
  label = BRAND.name,
  showTagline = false,
  className = "",
  markClassName = "h-11 w-11",
  textClassName = "text-xl font-bold tracking-tight",
  taglineClassName = "text-[0.65rem] font-semibold tracking-wide text-slate-500",
}: BrandLogoProps) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/tripsync-mark.png"
        alt=""
        width={48}
        height={48}
        priority
        className={`${markClassName} shrink-0 rounded-2xl bg-white shadow-lg shadow-brand-blue/20`}
        aria-hidden
      />
      <span className="flex min-w-0 flex-col">
        <span className={textClassName}>{label}</span>
        {showTagline && <span className={taglineClassName}>{BRAND.tagline}</span>}
      </span>
    </span>
  );
}
