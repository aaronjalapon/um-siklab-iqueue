import Image from "next/image";

type BrandLogoProps = {
  label?: string;
  className?: string;
  markClassName?: string;
  textClassName?: string;
};

export default function BrandLogo({
  label = "IQueue",
  className = "",
  markClassName = "h-11 w-11",
  textClassName = "text-xl font-bold tracking-tight",
}: BrandLogoProps) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/logo.svg"
        alt=""
        width={48}
        height={48}
        className={`${markClassName} shrink-0 rounded-2xl shadow-lg shadow-brand-blue/20`}
        aria-hidden
      />
      <span className={textClassName}>{label}</span>
    </span>
  );
}
