"use client"

import { ArrowRight } from "lucide-react"
import Image from "next/image"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

export default function Hero() {
  const { ref: textRef, isVisible: textVisible } = useScrollReveal()
  const { ref: imageRef, isVisible: imageVisible } = useScrollReveal()

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-white to-accent/10 pt-20 pb-20 md:pt-0">
      {/* Background Elements Decorativos */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-60 animate-float-slow z-0"></div>
      <div
        className="absolute bottom-20 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-60 animate-float-slow z-0"
        style={{ animationDelay: "2s" }}
      ></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Text Content - Lado Izquierdo */}
          <div
            ref={textRef}
            className={`animate-slide-up transition-all duration-700 ${
              textVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
            }`}
          >
            <div className="mb-4">
              <span className="text-3xl md:text-4xl text-foreground font-medium">
                Bienvenido a
              </span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-brand">
                Kyroy Stilos
              </span>
            </h1>

            <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Belleza Premium{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Diseñada para Ti
              </span>
            </h2>

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              En Kyroy Stilos ofrecemos servicios de uñas, cabello y depilación con los más altos estándares de calidad
              y profesionalismo. Cada servicio es una experiencia de lujo y cuidado.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#contacto"
                className="px-8 py-3 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 group"
              >
                Agendar Cita
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#servicios"
                className="px-8 py-3 rounded-full border-2 border-primary text-primary font-medium hover:bg-primary/5 transition-all duration-300"
              >
                Conocer Servicios
              </a>
            </div>
          </div>

          {/* Image - Lado Derecho */}
          <div
            ref={imageRef}
            className={`relative animate-fade-in transition-all duration-700 ${
              imageVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
            }`}
            style={{ animationDelay: "0.3s" }}
          >
            <div className="relative w-full aspect-[4/3]">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl transform -rotate-6"></div>
              <div className="absolute inset-0 bg-gradient-to-tl from-primary/10 to-transparent rounded-3xl transform rotate-6"></div>
              <div className="relative bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl p-8 flex items-center justify-center backdrop-blur h-full">
                <div className="relative w-full h-full">
                  <Image
                    src="/sal-n-de-belleza-lujo-elegante-rosa-dorado.jpg"
                    alt="Kyroy Stilos Salón de Belleza"
                    fill
                    className="object-contain rounded-2xl shadow-xl"
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
