"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { useLang } from "@/lib/LangContext";

export function Hero() {
  const { t } = useLang();
  const stats = [
    { num: t.common.statExperienceValue, label: t.stats.experience },
    { num: t.common.statSatisfiedValue, label: t.stats.satisfied },
    { num: t.common.statAvailabilityValue, label: t.stats.availability }
  ];

  return (
    <section className="relative min-h-[95vh] flex flex-col">
      <div className="absolute inset-0">
        <img src="/images/hero-car.jpg"
          className="w-full h-full object-cover object-center" alt="" />
        <div className="absolute inset-0
          bg-gradient-to-r
          from-brand-navy/95
          via-brand-navy/70
          to-brand-navy/10" />
        <div className="absolute bottom-0 inset-x-0 h-32
          bg-gradient-to-t from-brand-cream to-transparent" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col
        justify-center px-8 lg:px-24 pt-32 pb-20 max-w-3xl">

        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-px bg-gold" />
          <span className="text-xs tracking-[0.3em] uppercase
            text-gold/80 font-dm">
            {t.hero.eyebrow}
          </span>
        </div>

        <h1 className="font-playfair text-6xl lg:text-8xl
          font-bold text-white leading-[0.92]
          tracking-tight mb-8">
          {t.hero.titleBefore}<br />
          <em className="text-gold not-italic">{t.hero.titleHighlight}</em> &<br />
          {t.hero.titleAfter}
        </h1>

        <p className="text-white/70 text-lg leading-relaxed
          max-w-md mb-12 font-dm font-light">
          {t.hero.subtitle}
        </p>

        <div className="flex flex-wrap items-center gap-6">
          <a href="#booking" className="group flex items-center gap-3
            bg-gold text-brand-navy font-medium
            px-8 py-4 text-xs tracking-[0.2em] uppercase
            hover:bg-gold-light transition-all duration-300">
            {t.hero.bookRide}
            <ArrowRight className="w-4 h-4
              group-hover:translate-x-1 transition-transform" />
          </a>

          <a href="#fleet" className="text-white/80 text-xs
            tracking-[0.2em] uppercase
            border-b border-white/30 pb-0.5
            hover:text-white hover:border-white
            transition-colors">
            {t.hero.ourFleet}
          </a>
        </div>
      </div>

      <div className="relative z-10 bg-brand-navy/90
        backdrop-blur-sm border-t border-white/10">
        <div className="max-w-5xl mx-auto
          grid grid-cols-3 divide-x divide-white/10">
          {stats.map(s => (
            <div key={s.label} className="py-7 text-center">
              <div className="font-playfair text-3xl
                text-gold font-semibold">{s.num}</div>
              <div className="text-xs tracking-[0.15em]
                uppercase text-white/50 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
