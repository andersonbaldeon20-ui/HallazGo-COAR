import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hallazgo-coar.aldobaldeon22.chatgpt.site"),
  title: "HallazGO | Plataforma escolar",
  description:
    "Registra, busca y recupera objetos perdidos dentro del colegio de forma rápida, organizada y segura.",
  openGraph: {
    title: "HallazGO | Plataforma escolar",
    description:
      "Encuentra lo que creías perdido. Registra, busca y recupera objetos dentro del colegio.",
    images: ["/og.png"],
    locale: "es_PE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HallazGO | Plataforma escolar",
    description:
      "Encuentra lo que creías perdido. Registra, busca y recupera objetos dentro del colegio.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
