import Image from 'next/image'

interface PlaceholderImageProps {
  width: number
  height: number
  alt: string
}

const PlaceholderImage: React.FC<PlaceholderImageProps> = ({ width, height, alt }) => {
  return (
    <Image
      src="/placeholder.svg"
      width={width}
      height={height}
      alt={alt}
      style={{ width: 'auto', height: 'auto' }}
    />
  )
}

export default PlaceholderImage

