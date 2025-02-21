import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory Management System",
  description: "Administra tu inventario de manera eficiente con nuestra plataforma.",
  keywords: ["inventario", "gestión", "almacén", "productos"],
  authors: [{ name: "Tu Nombre", url: "https://tuweb.com" }],
  openGraph: {
    title: "Inventory Management System",
    description: "Administra tu inventario de manera eficiente con nuestra plataforma.",
    url: "https://tuweb.com",
    siteName: "Inventory Management System",
    images: [
      {
        url: "https://tuweb.com/imagen.jpg",
        width: 1200,
        height: 630,
        alt: "Imagen de la plataforma",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Inventory Management System",
    description: "Administra tu inventario de manera eficiente con nuestra plataforma.",
    images: ["https://tuweb.com/imagen.jpg"],
  },
};
