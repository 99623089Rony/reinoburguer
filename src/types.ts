
export enum OrderStatus {
  AWAITING_PAYMENT = 'Aguardando Pagamento',
  PENDING = 'Pendente',
  PREPARING = 'Preparo',
  DELIVERING = 'Entrega',
  FINISHED = 'Finalizado'
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  inStock: boolean;
  highlighted: boolean;
  trackStock?: boolean;
  stockQuantity?: number;
}

export interface CartItem extends Product {
  cartId?: string; // Unique ID for this specific line item
  quantity: number;
  extras?: { name: string; price: number }[];
  observation?: string;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  total: number;
  paymentMethod: string;
  status: OrderStatus;
  items: CartItem[];
  timestamp: Date;
  couponUsed?: string;
  rewardTitle?: string;
  dailyOrderNumber?: number;
  deliveryFee?: number;
  cardFee?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalSpent: number;
  points: number;
  pointsMonthly: number; // Added for the monthly ranking competition
  address?: string; // Added for local profile persistence
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  type: 'discount' | 'product';
  discountValue?: number;
  imageUrl?: string;
  productId?: string; // Optional link to a specific menu product
  isActive: boolean;
}

export interface CustomerCoupon {
  id: string;
  customerPhone: string;
  rewardId: string;
  code: string;
  isUsed: boolean;
  reward?: Reward;
  createdAt: Date;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'fixed' | 'percentage';
  value: number;
  minOrder: number;
  validUntil: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
}

export interface StoreConfig {
  id: string;
  name: string;
  coverUrl: string;
  logoUrl: string;
  primaryColor: string;
  whatsapp?: string;
  pixKey?: string;
  address?: string; // Store address for pickup
  cardFeePercent?: number; // Deprecated, keeping for backward compat if needed
  cardDebitFeePercent?: number; // New Debit Fee
  cardCreditFeePercent?: number; // New Credit Fee
  pixFeePercent?: number; // New PIX Fee
  printerSettings?: PrinterConfig;
  rankingPeriod?: 'weekly' | 'fortnightly' | 'monthly';
  rankingPrizeId?: string;
  loyaltyEnabled?: boolean;
  rankingEnabled?: boolean;
  rewardsEnabled?: boolean;
}

export interface PrinterConfig {
  id?: string;
  type: 'usb' | 'bluetooth' | 'network';
  autoPrint: boolean;
  paperSize: '58mm' | '80mm';
  copies: number;
}

export interface ExtraGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  options: ExtraOption[];
}

export interface ExtraOption {
  id: string;
  name: string;
  price: number;
  description?: string;
  maxQuantity?: number;
}

export interface OpeningHour {
  id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export interface DeliveryFee {
  id: string;
  neighborhood: string;
  fee: number;
  is_active: boolean;
}

export interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  category: string;
  paymentMethod?: string;
  orderId?: string;
  createdAt: Date;
}

export interface FinancialSummary {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  byPaymentMethod: { method: string; amount: number }[];
}
