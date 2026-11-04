import {
  ArrowRight,
  Bell,
  Boxes,
  ClipboardList,
  Coins,
  Eye,
  Grid2X2,
  Heart,
  Leaf,
  Package,
  Pencil,
  Plus,
  ShoppingCart,
  Store,
  Trash2,
  Truck,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react'

const icons = {
  close: X,
  'arrow-right': ArrowRight,
  grid: Grid2X2,
  users: Users,
  wallet: WalletCards,
  package: Package,
  boxes: Boxes,
  clipboard: ClipboardList,
  truck: Truck,
  coin: Coins,
  store: Store,
  bell: Bell,
  leaf: Leaf,
  heart: Heart,
  user: UserRound,
  cart: ShoppingCart,
  edit: Pencil,
  plus: Plus,
  trash: Trash2,
  eye: Eye,
}

export function DashboardIcon({ name, className = 'size-5' }) {
  const Icon = icons[name] || Grid2X2
  return <Icon className={className} aria-hidden="true" strokeWidth={2} />
}
