export interface Product {
    id: string
    brand: string
    reference: string
    color: string
    gender: 'Dama' | 'Hombre'
    sizes: { [key: string]: number }
    imageUrl: string
    total: number
  }
  
  export interface ProductCardProps {
    product: Product
    onDelete: () => void
    onUpdate: () => void
  }