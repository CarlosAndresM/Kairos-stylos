"use client"

import { useEffect } from 'react'
import { seedData } from '@/lib/seed'

export default function SeedInitializer() {
  useEffect(() => {
    seedData()
  }, [])

  return null
}

