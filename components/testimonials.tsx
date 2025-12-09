"use client"

import { Star } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const testimonials = [
  {
    name: "María García",
    text: "El mejor lugar para cuidarse. Karen y su equipo son profesionales increíbles. Mis uñas nunca se vieron tan bien.",
    rating: 5,
  },
  {
    name: "Jessica López",
    text: "Experiencia de lujo. Los servicios son excelentes, y el ambiente es muy relajante. Definitivamente vuelvo.",
    rating: 5,
  },
  {
    name: "Andrea Martínez",
    text: "Karen es una artista. Me hizo un cambio de look que me encanta. Muy profesional y creativa.",
    rating: 5,
  },
]

export default function Testimonials() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal()

  return (
    <section id="testimonios" className="py-20 md:py-32 bg-gradient-to-b from-primary/5 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Lo Que Dicen Nuestros Clientes</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => {
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
              <div className="bg-white rounded-2xl p-8 border border-primary/10 hover:border-primary/30 shadow-sm hover:shadow-xl transition-all duration-300 h-full">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={18} className="fill-accent text-accent" />
                  ))}
                </div>

                <p className="text-muted-foreground mb-6 leading-relaxed">"{testimonial.text}"</p>

                <p className="font-semibold text-foreground">{testimonial.name}</p>
              </div>
            </div>
          )})}
        </div>
      </div>
    </section>
  )
}
