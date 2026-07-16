// Registro de operaciones con persistencia local (localStorage).
import { useSyncExternalStore } from 'react'
import type { Transaction } from '../types.ts'

const KEY = 'buffett-daily.transactions.v1'

function load(): Transaction[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as Transaction[]) : []
    return parsed.toSorted((a, b) => a.date.localeCompare(b.date))
  } catch {
    return []
  }
}

let snapshot: Transaction[] = load()
const listeners = new Set<() => void>()

function persist(next: Transaction[]): void {
  snapshot = next.toSorted((a, b) => a.date.localeCompare(b.date))
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot))
  } catch {
    /* almacenamiento no disponible: se mantiene en memoria */
  }
  listeners.forEach((l) => l())
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function getTransactions(): Transaction[] {
  return snapshot
}

export function addTransaction(data: Omit<Transaction, 'id'>): Transaction {
  const tx: Transaction = { ...data, id: newId() }
  persist([...snapshot, tx])
  return tx
}

export function updateTransaction(id: string, patch: Partial<Omit<Transaction, 'id'>>): void {
  persist(snapshot.map((t) => (t.id === id ? { ...t, ...patch } : t)))
}

export function removeTransaction(id: string): void {
  persist(snapshot.filter((t) => t.id !== id))
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useTransactions(): Transaction[] {
  return useSyncExternalStore(subscribe, getTransactions)
}
