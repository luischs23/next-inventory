import React from 'react'
import { Card, CardContent } from "app/components/ui/card"

interface Size {
    quantity: number
    barcodes: string[]
  }

  interface Product {
    id: string
    brand: string
    reference: string
    color: string
    sizes: { [size: string]: Size }
  }

interface ProductCardProps {
  product: Product
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    const size = Object.entries(product.sizes)[0] // Get the first (and only) size
  
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold">{product.brand} - {product.reference}</h3>
          <p>Color: {product.color}</p>
          <p>Size: {size[0]}</p>
          <p>Quantity: {size[1].quantity}</p>
          <p>Barcode: {size[1].barcodes[0]}</p>
        </CardContent>
      </Card>
    )
  }
  
  export default ProductCard