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
import { AbsenInLogo } from "@/components/AbsenInLogo";

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
    router.push("/syarat-ketentuan?flow=consent");
  };

  const onNext = () => {
    if (api && current < 2) {
      api.scrollNext();
    } else {
      router.push("/syarat-ketentuan?flow=consent");
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
      title: <>Kelola Jadwal, <br />Tugas & Izin Praktis</>,
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
    <div className="flex flex-col min-h-[100dvh] h-[100dvh] bg-background relative overflow-y-auto overflow-x-hidden justify-between select-none">
      {/* Subtle Glow Effects (Dari PRD/Figma) */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center px-5 py-3.5 sm:px-6 sm:py-5 z-10 shrink-0">
        <AbsenInLogo size="sm" />
        <Button 
          variant="ghost" 
          className="text-[#5C786C] hover:text-[#1E4738] text-xs sm:text-sm font-semibold h-8 px-3 rounded-full hover:bg-black/5" 
          onClick={onSkip}
        >
          Lewati
        </Button>
      </div>

      {/* Carousel Section */}
      <div className="flex-1 flex flex-col justify-center px-2 sm:px-4 z-10 my-auto min-h-0">
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {slides.map((slide, index) => (
              <CarouselItem key={index}>
                <div className="flex flex-col items-center text-center px-4 py-2 sm:py-4">
                  {/* Illustration Image with Responsive Height */}
                  <div className="w-full flex justify-center items-center mb-4 sm:mb-6 h-[160px] xs:h-[190px] sm:h-[230px] max-h-[26vh] sm:max-h-[30vh]">
                    <img 
                      src={slide.image} 
                      alt="Onboarding Illustration" 
                      className="h-full w-auto max-w-[85%] object-contain drop-shadow-sm" 
                    />
                  </div>

                  {/* Title */}
                  <h1 className="text-[20px] xs:text-[23px] sm:text-[26px] leading-[1.25] font-bold text-[#1E4738] mb-2 sm:mb-3 tracking-tight max-w-[340px] sm:max-w-[420px]">
                    {slide.title}
                  </h1>

                  {/* Description */}
                  <p className="text-[#5C786C] text-[13px] sm:text-[14px] leading-relaxed max-w-[300px] sm:max-w-[380px]">
                    {slide.description}
                  </p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Footer / Controls */}
      <div className="px-5 pb-5 pt-2 sm:px-6 sm:pb-8 sm:pt-4 flex flex-col items-center gap-4 sm:gap-6 z-10 shrink-0">
        {/* Slide Indicators */}
        <div className="flex gap-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ease-out ${
                current === index ? "w-7 bg-primary" : "w-2 bg-primary/20"
              }`}
            />
          ))}
        </div>

        {/* Buttons Row */}
        <div className="flex w-full gap-2.5 sm:gap-3">
          {current > 0 && (
            <Button
              size="icon"
              className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-full shadow-sm hover:shadow-md transition-all bg-[#356E3B] hover:bg-[#2b5930] text-white active:scale-95 cursor-pointer"
              onClick={onPrev}
              aria-label="Kembali ke slide sebelumnya"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
            </Button>
          )}
          <Button
            size="lg"
            className="flex-1 text-[14px] sm:text-[15px] font-semibold h-12 sm:h-14 rounded-full shadow-sm hover:shadow-md transition-all bg-[#356E3B] hover:bg-[#2b5930] text-white active:scale-95 cursor-pointer"
            onClick={onNext}
          >
            {current === 2 ? "Mulai Sekarang" : "Lanjutkan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
