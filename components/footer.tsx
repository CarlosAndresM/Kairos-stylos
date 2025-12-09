import { Instagram, Facebook } from "lucide-react"
import Image from "next/image"

export default function Footer() {
  return (
    <footer className="bg-foreground text-white py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-12 h-12 flex-shrink-0">
                <Image
                  src="/LOGO.png"
                  alt="Kyroy Stilos Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="font-bold font-brand">Kyroy Stilos</h3>
                <p className="text-xs text-white/60">by Karen Ovalle</p>
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              Belleza premium diseñada para ti. Servicios de calidad con profesionales certificados.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-4">Servicios</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Uñas Premium
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Cabello Profesional
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Depilación
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href="#nosotros" className="hover:text-primary transition-colors">
                  Sobre Nosotros
                </a>
              </li>
              <li>
                <a href="#testimonios" className="hover:text-primary transition-colors">
                  Testimonios
                </a>
              </li>
              <li>
                <a href="#contacto" className="hover:text-primary transition-colors">
                  Contacto
                </a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold mb-4">Síguenos</h4>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary transition-colors"
              >
                <Instagram size={20} />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary transition-colors"
              >
                <Facebook size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/60">
          <p>&copy; 2025 Kyroy Stilos. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">
              Privacidad
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Términos
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
