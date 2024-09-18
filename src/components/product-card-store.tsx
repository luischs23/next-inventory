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
}

interface ProductCardProps {
  product: ProductWithBarcode
  itemNumber?: number
}

const ProductCard: React.FC<ProductCardProps> = ({ product, itemNumber }) => {
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
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{product.brand} - {product.reference}</h3>
          <p>Color: {product.color}</p>
          <p>Size: {product.size}</p>
          <p>Barcode: {product.barcode}</p>
          <p>Added: {formatDate(product.addedAt)}</p>
        </div>
        <div className="w-24 h-24 relative">
          <Image
            src={product.imageUrl}
            alt={`${product.brand} ${product.reference}`}
            layout="fill"
            objectFit="cover"
          />
        </div>
        {itemNumber !== undefined && (
          <div className="ml-4 text-2xl font-bold">{itemNumber}</div>
        )}
      </CardContent>
    </Card>
  )
}

export default ProductCard