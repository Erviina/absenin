"use client";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { CheckCircle2, CalendarDays, Users, ChevronLeft } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const onSkip = () => {
    router.push("/login");
  };

  const onNext = () => {
    if (api && current < 2) {
      api.scrollNext();
    } else {
      router.push("/login");
    }
  };

  const onPrev = () => {
    if (api && current > 0) {
      api.scrollPrev();
    }
  };

  const slides = [
    {
      title: "Absen Mudah Tepat Waktu",
      description: <>Catat kehadiran harianmu dengan mudah, dengan tampilan ramah pengguna.</>,
      image: "/img/assets/onboard1.png",
    },
    {
      title: <>Kelola Jadwal, <br/>Tugas & Izin Praktis</>,
      description: <>Cek agenda, tugas kerja dan ajukan izin tanpa ribet.</>,
      image: "/img/assets/onboard2.png",
    },
    {
      title: "Satu Aplikasi untuk Semua",
      description: <>Kolaborasi efisien untuk Karyawan & Manajemen.</>,
      image: "/img/assets/onboard3.png",
    },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background relative overflow-hidden">
      {/* Subtle Glow Effects (Dari PRD/Figma) */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center p-6 z-10">
        <img src="/img/assets/Logo.png" alt="AbsenIn Logo" className="h-6 w-auto object-contain" />
        <Button variant="ghost" className="text-[#5C786C] font-medium" onClick={onSkip}>
          Lewati
        </Button>
      </div>

      {/* Carousel Section */}
      <div className="flex-1 flex flex-col justify-center px-4 z-10 pb-12">
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {slides.map((slide, index) => (
              <CarouselItem key={index}>
                <div className="flex flex-col items-center text-center p-4 pt-12">
                  <div className="w-full flex justify-center mb-8 h-[250px]">
                    <img src={slide.image} alt="Onboarding Illustration" className="h-full w-auto object-contain" />
                  </div>
                  <h1 className="text-[28px] leading-tight font-bold text-[#1E4738] mb-4 tracking-tight">
                    {slide.title}
                  </h1>
                  <p className="text-[#5C786C] text-[15px] leading-relaxed max-w-[500px]">
                    {slide.description}
                  </p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Footer / Controls */}
      <div className="p-6 flex flex-col items-center gap-10 z-10 pb-8 mt-auto">
        {/* Slide Indicators */}
        <div className="flex gap-2.5">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ease-out ${
                current === index ? "w-8 bg-primary" : "w-2 bg-primary/20"
              }`}
            />
          ))}
        </div>

        {/* Buttons Row */}
        <div className="flex w-full gap-3 mt-4">
          {current > 0 && (
            <Button 
              size="icon"
              className="h-14 w-14 shrink-0 rounded-full shadow-sm hover:shadow-md transition-all bg-[#356E3B] hover:bg-[#356E3B]/90 text-white" 
              onClick={onPrev}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}
          <Button 
            size="lg" 
            className="flex-1 text-[15px] font-semibold h-14 rounded-full shadow-sm hover:shadow-md transition-all bg-[#356E3B] hover:bg-[#356E3B]/90 text-white" 
            onClick={onNext}
          >
            {current === 2 ? "Mulai Sekarang" : "Lanjutkan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
