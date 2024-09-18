import React from 'react'
import { Card, CardContent } from "app/components/ui/card"
import Image from 'next/image'

interface ProductWithBarcode {
  id: string
  brand: string
  reference: string
  color: string
  size: string
  barcode: string
  imageUrl: string
  saleprice: number
}

interface ProductCardProps {
  product: ProductWithBarcode
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <Card className="w-full">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{product.brand} - {product.reference}</h3>
          <p>Color: {product.color}</p>
          <p>Size: {product.size}</p>
          <p>Barcode: {product.barcode}</p>
          <p>Sale Price: {product.saleprice}</p>
        </div>
        <div className="w-24 h-24 relative">
          <Image
            src={product.imageUrl}
            alt={`${product.brand} ${product.reference}`}
            layout="fill"
            className='object-cover'
            priority
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default ProductCard