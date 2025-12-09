"use client"

import { Sparkles, Wind, Scissors } from "lucide-react"
import { useState } from "react"
import Image from "next/image"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const services = [
  {
    icon: Sparkles,
    title: "Uñas Premium",
    description:
      "Manicura, pedicura y diseños personalizados con productos de alta calidad. Desde esmaltado clásico hasta nail art sofisticado.",
    color: "from-pink-400 to-rose-500",
    images: [
      { src: "/images/u-c3-91as.jpg", alt: "Manicura elegante con diseño dorado y blanco" },
      { src: "/images/u-c3-91as2.jpg", alt: "Manicura delicada con tonos naturales" },
      { src: "/images/u-c3-91as-203.jpg", alt: "Diseño de uñas premium con detalles florales" },
      { src: "/images/unas1.jpg", alt: "Diseño de uñas artístico" },
      { src: "/images/unas2.jpg", alt: "Manicura profesional" },
      { src: "/images/unas3.jpg", alt: "Pedicura y manicura premium" },
    ],
  },
  {
    icon: Scissors,
    title: "Cabello Profesional",
    description:
      "Cortes, coloración, tratamientos y peinados para ocasiones especiales. Expertos en cuidado capilar y transformaciones.",
    color: "from-amber-400 to-yellow-500",
    images: [
      { src: "/images/persona-cabello.jpg", alt: "Corte profesional de cabello" },
      { src: "/images/persona-20cabello-202.jpg", alt: "Cabello largo y brillante transformación" },
      { src: "/images/persona-20cabello-203.jpg", alt: "Corte y coloración profesional" },
      { src: "/images/cabello-204.jpg", alt: "Resultado antes y después de transformación capilar" },
      { src: "/images/cabello1.jpg", alt: "Corte de cabello profesional" },
      { src: "/images/cabello2.jpg", alt: "Coloración y tratamiento capilar" },
      { src: "/images/cabello3.jpg", alt: "Peinado y estilo profesional" },
    ],
  },
  {
    icon: Wind,
    title: "Depilación & Cejas",
    description:
      "Depilación con cera y otras técnicas profesionales para obtener una piel suave y cuidada. Diseño de cejas perfecto.",
    color: "from-rose-400 to-pink-500",
    images: [
      { src: "/images/cejas.jpg", alt: "Diseño profesional de cejas y maquillaje" },
      { src: "/images/cejas1.jpg", alt: "Diseño de cejas perfecto" },
    ],
  },
]

export default function Services() {
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null)
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal()

  return (
    <section id="servicios" className="py-20 md:py-32 bg-gradient-to-b from-white to-primary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Nuestros Servicios</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ofrecemos servicios de belleza premium con profesionales altamente capacitados
          </p>
        </div>

        {/* Galería de imágenes por categoría */}
        <div className="space-y-20">
          {services.map((service, index) => {
            const Icon = service.icon
            const { ref, isVisible } = useScrollReveal()
            return (
              <div
                key={index}
                ref={ref}
                className={`transition-all duration-700 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Encabezado de categoría */}
                <div className="flex items-center gap-4 mb-8">
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center text-white shadow-lg`}
                  >
                    <Icon size={32} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-foreground">{service.title}</h3>
                    <p className="text-muted-foreground mt-1">{service.description}</p>
                  </div>
                </div>

                {/* Galería de imágenes */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {service.images.map((image, imgIndex) => (
                    <div
                      key={imgIndex}
                      className="relative aspect-square rounded-xl overflow-hidden border border-primary/20 hover:border-primary/50 transition-all cursor-pointer group shadow-md hover:shadow-xl"
                      onClick={() => setSelectedImage(image)}
                    >
                      <Image
                        src={image.src || "/placeholder.svg"}
                        alt={image.alt}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-white text-sm font-medium">
                          {image.alt}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal para vista ampliada */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              ✕
            </button>
            <div className="relative w-full h-full rounded-lg overflow-hidden">
              <Image
                src={selectedImage.src}
                alt={selectedImage.alt}
                fill
                className="object-contain"
              />
            </div>
            <p className="text-white text-center mt-4 text-lg">{selectedImage.alt}</p>
          </div>
        </div>
      )}
    </section>
  )
}
