import React from 'react'
import { Card, CardContent } from "app/components/ui/card"
import Image from 'next/image'
import { Timestamp } from 'firebase/firestore'

interface ProductWithBarcode {
  id: string
  brand: string
  reference: string
  color: string
  size: string
  barcode: string
  imageUrl: string
  addedAt?: Timestamp | Date
  quantity: number
  isBox?: boolean
}

interface ProductCardProps {
  product: ProductWithBarcode
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const formatDate = (date: Timestamp | Date | undefined) => {
    if (!date) return 'N/A'
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleString()
    }
    if (date instanceof Date) {
      return date.toLocaleString()
    }
    return 'Invalid Date'
  }

  return (
    <Card className="w-full">
      <CardContent className="p-2 flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{product.brand} - {product.reference}</h3>
          <p>Color: {product.color}</p>
          <p>{product.isBox ? 'Box' : 'Size'}: {product.isBox ? product.quantity : product.size}</p>
          <p>Barcode: {product.barcode}</p>
          <p>Added: {formatDate(product.addedAt)}</p>
        </div>
        <div className="w-24 h-24 relative">
          <Image
            src={product.imageUrl}
            alt={`${product.brand} ${product.reference}`}
            fill
            className="object-cover rounded-md"
          />
        </div>
      </CardContent>
    </Card>
  )  
}

export default ProductCard