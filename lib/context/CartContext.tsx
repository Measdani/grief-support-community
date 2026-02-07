'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface CartItem {
  productId: string
  memorialId: string
  memorialName: string // For display
  productName: string
  productType: string
  priceCents: number
  previewImageUrl: string
  dedicationMessage?: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string, memorialId: string) => void
  updateMessage: (productId: string, memorialId: string, message: string) => void
  clearCart: () => void
  totalCents: number
  itemCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('memorial-store-cart')
    if (saved) {
      try {
        setItems(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load cart:', e)
      }
    }
    setIsHydrated(true)
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('memorial-store-cart', JSON.stringify(items))
    }
  }, [items, isHydrated])

  const addItem = (item: CartItem) => {
    setItems(prev => {
      // Check if item already exists (same product + memorial)
      const exists = prev.find(
        i => i.productId === item.productId && i.memorialId === item.memorialId
      )
      if (exists) {
        return prev // Don't add duplicates
      }
      return [...prev, item]
    })
  }

  const removeItem = (productId: string, memorialId: string) => {
    setItems(prev =>
      prev.filter(i => !(i.productId === productId && i.memorialId === memorialId))
    )
  }

  const updateMessage = (productId: string, memorialId: string, message: string) => {
    setItems(prev =>
      prev.map(i =>
        i.productId === productId && i.memorialId === memorialId
          ? { ...i, dedicationMessage: message }
          : i
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const totalCents = items.reduce((sum, item) => sum + item.priceCents, 0)
  const itemCount = items.length

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateMessage,
      clearCart,
      totalCents,
      itemCount,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
