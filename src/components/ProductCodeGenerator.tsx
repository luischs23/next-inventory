import React, { useState, useEffect } from 'react'

interface ProductCodeGeneratorProps {
  warehouseId: string
  onCodeGenerated: (code: string) => void
}

export const ProductCodeGenerator: React.FC<ProductCodeGeneratorProps> = ({ warehouseId, onCodeGenerated }) => {
  const [sequence, setSequence] = useState(1)

  useEffect(() => {
    // In a real application, you would fetch the last used sequence number from your database
    // For this example, we'll start with 1 each time the component mounts
    setSequence(1)
  }, [])

  const generateProductCode = () => {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const warehouseCode = warehouseId.slice(-3).padStart(3, '0')
    const sequenceNumber = sequence.toString().padStart(9, '0')
    
    const code = `${year}${month}${day}${warehouseCode}${sequenceNumber}`
    
    setSequence(prevSequence => prevSequence + 1)
    onCodeGenerated(code)
    
    return code
  }

  return (
    <div>
      <button onClick={generateProductCode} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Generate Product Code
      </button>
    </div>
  )
}