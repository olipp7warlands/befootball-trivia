import type { Metadata } from "next"
import { Archivo, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
})

const archivoBlack = Archivo({
  subsets: ["latin"],
  weight: "900",
  style: "italic",
  variable: "--font-archivo-black",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Befootball World Cup Trivia",
  description: "Demuestra que sabes de Mundiales. Reta a tus amigos en el juego de trivia de fútbol más intenso.",
  openGraph: {
    title: "Befootball World Cup Trivia",
    description: "Demuestra que sabes de Mundiales.",
    siteName: "Befootball Trivia",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Befootball World Cup Trivia",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="es"
      className={`${archivo.variable} ${archivoBlack.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-dvh flex flex-col antialiased">
        {children}
      </body>
    </html>
  )
}
