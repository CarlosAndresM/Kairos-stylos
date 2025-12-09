"use client"

import Image from "next/image"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

export default function About() {
  const { ref: imageRef, isVisible: imageVisible } = useScrollReveal()
  const { ref: contentRef, isVisible: contentVisible } = useScrollReveal()
  const { ref: teamRef, isVisible: teamVisible } = useScrollReveal()

  return (
    <section id="nosotros" className="py-20 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          {/* Image */}
          <div
            ref={imageRef}
            className={`relative order-2 md:order-1 transition-all duration-700 ${
              imageVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
            }`}
          >
            <div className="relative aspect-square">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl"></div>
              <Image
                src="/images/KAREN OVALLE.jpeg"
                alt="Karen Ovalle"
                fill
                className="relative object-cover rounded-3xl shadow-2xl"
              />
            </div>
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            className={`order-1 md:order-2 transition-all duration-700 ${
              contentVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
            }`}
          >
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/10 text-primary">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="text-sm font-medium">Sobre Nosotros</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Conoce a{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Karen Ovalle
              </span>
            </h2>
 

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white flex-shrink-0 mt-1">
                  ✓
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Lorem Ipsum Dolor</h4>
                  <p className="text-muted-foreground">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white flex-shrink-0 mt-1">
                  ✓
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Consectetur Adipiscing</h4>
                  <p className="text-muted-foreground">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white flex-shrink-0 mt-1">
                  ✓
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Sed Do Eiusmod</h4>
                  <p className="text-muted-foreground">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Equipo de Trabajo */}
        <div
          ref={teamRef}
          className={`transition-all duration-700 ${
            teamVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/10 text-primary">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="text-sm font-medium">Nuestro Equipo</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Conoce a{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Nuestro Equipo
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
            </p>
          </div>

          <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl bg-white">
            <div className="relative w-full">
              <img
                src="/images/EQUIPODETRABAJO.jpg"
                alt="Equipo de trabajo de Kyroy Stilos"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
