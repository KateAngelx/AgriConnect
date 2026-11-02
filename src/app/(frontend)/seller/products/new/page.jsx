import { redirect } from 'next/navigation'

export default function NewProductPage() {
  redirect('/seller/products?new=1')
}
