"use client"

import { useState } from "react"
import { Menu, X, MessageCircle } from "lucide-react"
import Image from "next/image"

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)

  const whatsappLink = "https://wa.me/573182165987"

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-primary/10">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 flex-shrink-0">
            <Image
              src="/LOGO.png"
              alt="Kyroy Stilos Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground font-brand">Kyroy Stilos</h1>
            <p className="text-xs text-muted-foreground">by Karen Ovalle</p>
          </div>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#servicios" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Servicios
          </a>
          <a href="#nosotros" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Nosotros
          </a>
          <a href="#testimonios" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Testimonios
          </a>
          <a href="#contacto" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Contacto
          </a>
          <a
            href="/login"
            className="px-6 py-2 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            Acceder
          </a>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 rounded-full border-2 border-primary text-primary font-medium hover:bg-primary/5 transition-all duration-300 flex items-center gap-2"
          >
            <MessageCircle size={18} />
            Contáctanos
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white border-b border-primary/10 md:hidden animate-slide-up">
            <div className="flex flex-col gap-4 p-4">
              <a href="#servicios" className="text-sm font-medium text-foreground hover:text-primary">
                Servicios
              </a>
              <a href="#nosotros" className="text-sm font-medium text-foreground hover:text-primary">
                Nosotros
              </a>
              <a href="#testimonios" className="text-sm font-medium text-foreground hover:text-primary">
                Testimonios
              </a>
              <a href="#contacto" className="text-sm font-medium text-foreground hover:text-primary">
                Contacto
              </a>
              <a
                href="/login"
                className="px-6 py-2 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium w-full text-center"
              >
                Acceder
              </a>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 rounded-full border-2 border-primary text-primary font-medium w-full flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} />
                Contáctanos
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
