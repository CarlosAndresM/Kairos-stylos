"use client"

import { MessageCircle } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

export default function Contact() {
  const whatsappLink = "https://wa.me/573182165987"

  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal()
  const { ref: contentRef, isVisible: contentVisible } = useScrollReveal()

  return (
    <section id="contacto" className="py-20 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Contáctanos</h2>
        </div>

        <div
          ref={contentRef}
          className={`max-w-2xl mx-auto text-center transition-all duration-700 ${
            contentVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl p-12 border border-primary/10">
            <div className="mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white mx-auto mb-6 shadow-lg">
                <MessageCircle size={40} />
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Estamos aquí para ayudarte. Si tienes alguna pregunta sobre nuestros servicios, deseas agendar una cita o necesitas más información, no dudes en contactarnos. Estaremos encantados de atenderte.
              </p>
            </div>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium hover:shadow-lg transition-all duration-300 hover:scale-105 group"
            >
              <MessageCircle size={24} />
              Contáctanos por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
