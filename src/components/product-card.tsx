import React from 'react'
import { Card, CardContent, CardFooter } from "./ui/card"
import { Button } from "./ui/button"
import Image from 'next/image'

interface SizeInput {
  quantity: number
  barcodes: string[]
}

interface Product {
  id: string
  brand: string
  reference: string
  color: string
  gender: 'Dama' | 'Hombre'
  sizes: { [key: string]: SizeInput }
  imageUrl: string
  total: number
}

interface ProductCardProps {
  product: Product
  onDelete: () => void
  onUpdate: () => void
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onDelete, onUpdate }) => {
  return (
    <Card className="flex">
        <div className="w-1/3">
          <Image
            src={product.imageUrl || '/placeholder.png'}
            alt={product.reference}
            width={190}
            height={150}
            className="rounded-md w-full h-auto object-cover"
            priority
          />
        </div>
      <div className="w-2/3 flex flex-col">
      <CardContent className="p-4 flex-grow">
        <h3 className="font-bold">{product.brand}</h3>
        <p>Ref: {product.reference}</p>
        <p>Color: {product.color}</p>
        <p>Gender: {product.gender}</p>
        <div className="mt-2">
        <h4 className="font-semibold">Sizes:</h4>
        {Object.entries(product.sizes)
            .sort(([a], [b]) => {
              const sizeA = parseInt(a.split('-')[1], 10);
              const sizeB = parseInt(b.split('-')[1], 10);
              return sizeA - sizeB;
            })
            .map(([size, sizeData]) => (
              <span key={size} className="mr-2">
                {size}: {sizeData.quantity}
              </span>
            ))}
        </div>
        <p className="mt-2 font-semibold">Total: {product.total}</p>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onUpdate}>Update</Button>
        <Button variant="destructive" onClick={onDelete}>Delete</Button>
      </CardFooter>
      </div>
    </Card>
  )
}

export default ProductCard