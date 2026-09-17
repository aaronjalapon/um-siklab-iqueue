"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Phone, UserRound } from "lucide-react";

export interface AseanCountry {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  mapCities: string;
  placeholder: string;
  maxLength: number;
}

export const ASEAN_COUNTRIES: AseanCountry[] = [
  {
    code: "PH",
    name: "Philippines",
    dialCode: "+63",
    flag: "🇵🇭",
    mapCities: "Manila, Cebu, Davao",
    placeholder: "917 123 4567",
    maxLength: 10,
  },
  {
    code: "ID",
    name: "Indonesia",
    dialCode: "+62",
    flag: "🇮🇩",
    mapCities: "Jakarta",
    placeholder: "812 3456 789",
    maxLength: 10,
  },
  {
    code: "MY",
    name: "Malaysia",
    dialCode: "+60",
    flag: "🇲🇾",
    mapCities: "Kuala Lumpur",
    placeholder: "12 345 6789",
    maxLength: 10,
  },
  {
    code: "SG",
    name: "Singapore",
    dialCode: "+65",
    flag: "🇸🇬",
    mapCities: "Singapore",
    placeholder: "8123 4567",
    maxLength: 10,
  },
  {
    code: "VN",
    name: "Vietnam",
    dialCode: "+84",
    flag: "🇻🇳",
    mapCities: "Ho Chi Minh",
    placeholder: "91 234 5678",
    maxLength: 10,
  },
];

export function parseAseanPhone(value: string): {
  country: AseanCountry;
  digits: string;
} {
  const clean = (value || "").trim();
  const matched = ASEAN_COUNTRIES.find((c) => clean.startsWith(c.dialCode));
  if (matched) {
    let rawDigits = clean.slice(matched.dialCode.length).replace(/\D/g, "");
    if (matched.code === "PH" && rawDigits.startsWith("0")) {
      rawDigits = rawDigits.slice(1);
    }
    return {
      country: matched,
      digits: rawDigits.slice(0, 10),
    };
  }
  let rawDigits = clean.replace(/\D/g, "");
  if (rawDigits.startsWith("0")) {
    rawDigits = rawDigits.slice(1);
  }
  return {
    country: ASEAN_COUNTRIES[0],
    digits: rawDigits.slice(0, 10),
  };
}

interface AseanContactInputProps {
  id: string;
  label?: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function AseanContactInput({
  id,
  label = "Mobile number",
  value,
  required = true,
  placeholder,
  onChange,
}: AseanContactInputProps) {
  const { country: initialCountry, digits } = parseAseanPhone(value);
  const [selectedCountry, setSelectedCountry] = useState<AseanCountry>(initialCountry);
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync selected country if external value starts with another country's dial code
  useEffect(() => {
    const matched = ASEAN_COUNTRIES.find((c) => value.startsWith(c.dialCode));
    if (matched && matched.code !== selectedCountry.code) {
      const frame = requestAnimationFrame(() => setSelectedCountry(matched));
      return () => cancelAnimationFrame(frame);
    }
  }, [value, selectedCountry.code]);

  // Determine dropdown orientation (dropup vs dropdown) to prevent clipping at bottom of screen
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    // Total dropdown height is ~210px. If less than 220px below and more space above, open upward
    if (spaceBelow < 220 && rect.top > 200) {
      setOpenUpward(true);
    } else {
      setOpenUpward(false);
    }
  }, [isOpen]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleDigitsChange(event: React.ChangeEvent<HTMLInputElement>) {
    // Strictly allow only numbers (0-9) and max 10 digits
    let raw = event.target.value.replace(/\D/g, "");
    if (selectedCountry.code === "PH" && raw.startsWith("0")) {
      raw = raw.slice(1);
    }
    const limited = raw.slice(0, 10);
    if (!limited) {
      onChange("");
    } else {
      onChange(`${selectedCountry.dialCode}${limited}`);
    }
  }

  function handleCountrySelect(country: AseanCountry) {
    setSelectedCountry(country);
    setIsOpen(false);
    if (digits) {
      onChange(`${country.dialCode}${digits}`);
    }
  }

  return (
    <div ref={containerRef} className="relative block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
      <div className="mb-1 flex items-center gap-1 text-slate-600 dark:text-slate-400">
        <label htmlFor={id} className="flex items-center gap-1 cursor-pointer">
          <Phone className="h-3.5 w-3.5 text-slate-500" aria-hidden />
          <span>{label}</span>
          {required && (
            <span className="text-red-500 font-bold ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      </div>

      <div className="relative flex items-stretch rounded-xl border border-glass-border bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm focus-within:ring-2 focus-within:ring-brand-blue/50 transition-all">
        {/* Country code selector button: space-optimized for mobile devices */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 sm:py-2 bg-slate-100/70 dark:bg-slate-800/70 border-r border-glass-border rounded-l-xl text-xs sm:text-sm font-semibold text-foreground hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-colors select-none shrink-0"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          title={`Selected: ${selectedCountry.name} (${selectedCountry.dialCode})`}
        >
          <span className="text-sm sm:text-base leading-none" role="img" aria-label={selectedCountry.name}>
            {selectedCountry.flag}
          </span>
          <span className="font-mono text-[11px] sm:text-xs font-bold tracking-tight">
            {selectedCountry.dialCode}
          </span>
          <ChevronDown
            className={`h-2.5 w-2.5 sm:h-3 sm:w-3 text-slate-400 transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>

        {/* Numeric digits input (strictly max 10 digits) */}
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          value={digits}
          onChange={handleDigitsChange}
          required={required}
          placeholder={placeholder !== undefined ? placeholder : (required ? "" : "Optional")}
          className="w-full bg-transparent px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-foreground focus:outline-none placeholder:text-slate-400 placeholder:italic font-medium"
        />

        {/* Counter indicator */}
        {digits.length > 0 && (
          <div className="flex items-center pr-2 sm:pr-3 pointer-events-none select-none">
            <span
              className={`text-[10px] font-mono ${
                digits.length === 10
                  ? "text-emerald-600 dark:text-emerald-400 font-bold"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {digits.length}/10
            </span>
          </div>
        )}
      </div>

      {/* ASEAN Country Dropdown Menu with smart up/down positioning */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select country dial code"
          className={`absolute left-0 ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } z-50 w-72 sm:w-80 rounded-xl border border-glass-border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl overflow-hidden py-1 animate-in fade-in ${
            openUpward ? "slide-in-from-bottom-2" : "slide-in-from-top-2"
          } duration-150`}
        >
          <div className="px-3 py-1.5 border-b border-glass-border bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ASEAN Route Network
            </span>
            <span className="text-[10px] text-slate-400">Connected Hubs</span>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-glass-border/40">
            {ASEAN_COUNTRIES.map((country) => {
              const isSelected = country.code === selectedCountry.code;
              return (
                <button
                  key={country.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleCountrySelect(country)}
                  className={`w-full text-left px-3 py-1.5 sm:py-2 flex items-center gap-2.5 transition-colors ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/50 text-brand-blue font-semibold"
                      : "hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-foreground"
                  }`}
                >
                  <span className="text-base sm:text-lg leading-none" role="img" aria-label={country.name}>
                    {country.flag}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate">{country.name}</span>
                      <span className="font-mono text-xs font-extrabold text-brand-blue">
                        {country.dialCode}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      Hub: {country.mapCities}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-brand-blue shrink-0" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface NameInputProps {
  id: string;
  label?: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function NameInput({
  id,
  label = "Full name",
  value,
  required = true,
  placeholder,
  onChange,
}: NameInputProps) {
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    // Strictly letters and spaces only: no numbers, no special characters
    const raw = event.target.value;
    const sanitized = raw
      .replace(/[^a-zA-Z\sñÑ]/g, "")
      .replace(/\s{2,}/g, " ");
    onChange(sanitized);
  }

  return (
    <label htmlFor={id} className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
      <span className="mb-1 flex items-center gap-1 text-slate-600 dark:text-slate-400">
        <UserRound className="h-3.5 w-3.5 text-slate-500" aria-hidden />
        <span>{label}</span>
        {required && (
          <span className="text-red-500 font-bold ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </span>
      <input
        id={id}
        type="text"
        value={value}
        onChange={handleChange}
        required={required}
        placeholder={placeholder || ""}
        maxLength={60}
        className="w-full block bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-glass-border rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition-all text-foreground placeholder:text-slate-400 font-medium"
      />
    </label>
  );
}
