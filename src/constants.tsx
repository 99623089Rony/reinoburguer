
import { Product, OrderStatus, Order, Customer, Coupon } from './types';

export const CATEGORIES = [
  { id: 'burgers', name: 'Hambúrgueres', icon: '🍔' },
  { id: 'pizzas', name: 'Pizzas', icon: '🍕' },
  { id: 'drinks', name: 'Bebidas', icon: '🥤' },
  { id: 'desserts', name: 'Sobremesas', icon: '🍰' },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'X-Salada Clássico',
    description: 'Pão brioche, hambúrguer artesanal, queijo, alface e tomate',
    price: 25.90,
    category: 'burgers',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&h=300',
    inStock: true,
    highlighted: false,
  },
  {
    id: '2',
    name: 'Batata Frita Suprema',
    description: 'Batata crocante com cheddar e bacon',
    price: 18.50,
    category: 'burgers',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=300&h=300',
    inStock: true,
    highlighted: true,
  },
  {
    id: '3',
    name: 'X-Bacon Gourmet',
    description: 'Hambúrguer 200g, bacon crocante, cebola caramelizada',
    price: 35.90,
    category: 'burgers',
    image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=300&h=300',
    inStock: true,
    highlighted: false,
  },
  {
    id: '4',
    name: 'Pizza de Pepperoni Grande',
    description: 'Massa artesanal, pepperoni fatiado, muito queijo',
    price: 55.00,
    category: 'pizzas',
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=300&h=300',
    inStock: true,
    highlighted: false,
  },
  {
    id: '5',
    name: 'Coca-Cola Lata 350ml',
    description: 'Refrescante original',
    price: 6.00,
    category: 'drinks',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&h=300',
    inStock: true,
    highlighted: false,
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: '12345',
    customerName: 'Ana Silva',
    phone: '(11) 98765-4321',
    address: 'Rua Augusta, 1500 - Ap 45',
    total: 125.90,
    paymentMethod: 'Cartão de Crédito',
    status: OrderStatus.PENDING,
    items: [],
    timestamp: new Date(),
  },
  {
    id: '12344',
    customerName: 'Bruno Santos',
    phone: '(21) 91234-5678',
    address: 'Av. Copacabana, 500',
    total: 89.50,
    paymentMethod: 'Pix',
    status: OrderStatus.PREPARING,
    items: [],
    timestamp: new Date(),
  },
  {
    id: '12343',
    customerName: 'Carla Dias',
    phone: '(31) 99876-1234',
    address: 'Praça da Liberdade, 10',
    total: 45.00,
    paymentMethod: 'Dinheiro',
    status: OrderStatus.DELIVERING,
    items: [],
    timestamp: new Date(),
  },
  {
    id: '12342',
    customerName: 'Daniel Lima',
    phone: '(41) 95555-1234',
    address: 'Rua das Flores, 123',
    total: 60.00,
    paymentMethod: 'Cartão de Débito',
    status: OrderStatus.FINISHED,
    items: [],
    timestamp: new Date(),
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Ana Silva', phone: '(11) 98765-4321', totalSpent: 2500, points: 350, pointsMonthly: 150 },
  { id: 'c2', name: 'Bruno Santos', phone: '(21) 91234-5678', totalSpent: 2500, points: 500, pointsMonthly: 200 },
  { id: 'c3', name: 'Carla Dias', phone: '(31) 99876-1234', totalSpent: 2500, points: 200, pointsMonthly: 50 },
  { id: 'c4', name: 'Daniel Lima', phone: '(41) 95555-1234', totalSpent: 2500, points: 300, pointsMonthly: 100 },
];
