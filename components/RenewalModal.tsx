'use client'

import { useState, useEffect } from 'react'
import { X, Calculator, RefreshCw } from 'lucide-react'

interface RenewalModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (amount: number, mode: RenewalMode, postDate: string) => Promise<void>
  mode: RenewalMode
  totalRenewalAmount: number
  totalCloseAmount?: number
  interestAmount?: number
  penaltyAmount?: number
  postDate?: string
  onPostDateChange?: (date: string) => void
  customerName?: string
  loanNumber?: string | number
  currentLoanAmount?: number
  isLoading?: boolean
}

export type RenewalMode = 'full' | 'partial' | 'close'

function allocatePayment(amount: number, penalty: number, interest: number, principal: number) {
  const penaltyPaid = Math.min(Math.max(0, amount), Math.max(0, penalty))
  const afterPenalty = Math.max(0, amount - penaltyPaid)
  const interestPaid = Math.min(afterPenalty, Math.max(0, interest))
  const afterInterest = Math.max(0, afterPenalty - interestPaid)
  const principalPaid = Math.min(afterInterest, Math.max(0, principal))
  return { penaltyPaid, interestPaid, principalPaid }
}

export default function RenewalModal({
  isOpen,
  onClose,
  onConfirm,
  mode,
  totalRenewalAmount,
  totalCloseAmount = 0,
  interestAmount = 0,
  penaltyAmount = 0,
  postDate: controlledPostDate,
  onPostDateChange,
  customerName,
  loanNumber,
  currentLoanAmount = 0,
  isLoading = false,
}: RenewalModalProps) {
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [localPostDate, setLocalPostDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [unpaidRenewal, setUnpaidRenewal] = useState<number>(0)
  const [principalPaid, setPrincipalPaid] = useState<number>(0)
  const [newLoanAmount, setNewLoanAmount] = useState<number>(0)
  const [error, setError] = useState<string>('')
  const postDate = controlledPostDate ?? localPostDate
  const setPostDate = (value: string) => {
    setLocalPostDate(value)
    onPostDateChange?.(value)
  }

  useEffect(() => {
    if (isOpen) {
      if (mode === 'full') {
        setPaymentAmount(totalRenewalAmount.toFixed(2))
      } else if (mode === 'close') {
        setPaymentAmount(totalCloseAmount.toFixed(2))
      } else {
        setPaymentAmount('')
      }
      const today = new Date().toISOString().slice(0, 10)
      setLocalPostDate(controlledPostDate || today)
      if (!controlledPostDate) onPostDateChange?.(today)
      setError('')
      setUnpaidRenewal(0)
      setPrincipalPaid(0)
      setNewLoanAmount(currentLoanAmount)
    }
  }, [isOpen, mode, totalRenewalAmount, totalCloseAmount, currentLoanAmount, controlledPostDate, onPostDateChange])

  useEffect(() => {
    const amount = parseFloat(paymentAmount) || 0
    const maxAmount = mode === 'close' ? totalCloseAmount : mode === 'partial' ? totalCloseAmount : totalRenewalAmount

    if (!paymentAmount) {
      setError('')
      setUnpaidRenewal(0)
      setPrincipalPaid(0)
      setNewLoanAmount(mode === 'close' ? 0 : currentLoanAmount)
      return
    }

    if (amount <= 0) {
      setError('Payment amount must be greater than 0')
      setUnpaidRenewal(0)
      setPrincipalPaid(0)
      return
    }

    if (amount > maxAmount) {
      setError(`Payment amount cannot exceed ${mode === 'close' ? 'close' : 'payable'} amount of ₹${formatCurrency(maxAmount)}`)
      setUnpaidRenewal(0)
      setPrincipalPaid(0)
      setNewLoanAmount(mode === 'close' ? 0 : currentLoanAmount)
      return
    }

    if (mode === 'full' && Math.abs(amount - totalRenewalAmount) > 0.01) {
      setError(`Full renewal must match ₹${formatCurrency(totalRenewalAmount)}`)
      return
    }

    if (mode === 'close' && Math.abs(amount - totalCloseAmount) > 0.01) {
      setError(`Closing loan must match ₹${formatCurrency(totalCloseAmount)}`)
      return
    }

    setError('')
    if (mode === 'close') {
      setUnpaidRenewal(0)
      setPrincipalPaid(currentLoanAmount)
      setNewLoanAmount(0)
      return
    }

    const renewalDue = Math.max(0, totalRenewalAmount)
    const unpaid = Math.max(0, renewalDue - amount)
    const principalReduction = Math.max(0, amount - renewalDue)
    setUnpaidRenewal(unpaid)
    setPrincipalPaid(principalReduction)
    setNewLoanAmount(Math.max(0, currentLoanAmount + unpaid - principalReduction))
  }, [paymentAmount, mode, totalRenewalAmount, totalCloseAmount, currentLoanAmount])

  const title =
    mode === 'full' ? 'Full Renewal'
      : mode === 'close' ? 'Closing Loan'
      : 'Partial Payment & Renewal'

  const note =
    'Payment is deducted first from penalty, then interest, then principal / loan amount. Any unpaid renewal amount is added to principal.'

  const amountLabel =
    mode === 'full' ? 'Renewal Amount *'
      : mode === 'close' ? 'Closing Amount *'
      : 'Payment Amount *'

  const confirmLabel =
    mode === 'full' ? 'Confirm Renewal'
      : mode === 'close' ? 'Confirm Closing'
      : 'Confirm Partial Renewal'

  const maxAmount = mode === 'close' ? totalCloseAmount : mode === 'partial' ? totalCloseAmount : totalRenewalAmount

  const allocation = (() => {
    const amount = parseFloat(paymentAmount) || 0
    return allocatePayment(amount, penaltyAmount, interestAmount, currentLoanAmount)
  })()

  const canConfirm = (() => {
    const amount = parseFloat(paymentAmount) || 0
    if (!paymentAmount || amount <= 0 || !!error || !postDate) return false
    if (mode === 'full') return Math.abs(amount - totalRenewalAmount) <= 0.01
    if (mode === 'close') return Math.abs(amount - totalCloseAmount) <= 0.01
    return amount <= totalCloseAmount
  })()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const handlePaymentAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '')
    const parts = sanitized.split('.')
    if (parts.length > 2) {
        return
      }
    if (parts[1] && parts[1].length > 2) {
        return
      }
    setPaymentAmount(sanitized)
  }

  const handleConfirm = async () => {
    const amount = parseFloat(paymentAmount)
    
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid payment amount')
      return
    }

    if (amount > totalRenewalAmount) {
      if (mode === 'full') {
        setError(`Payment amount cannot exceed renewal amount of ₹${formatCurrency(totalRenewalAmount)}`)
        return
      }
    }

    if (amount > maxAmount) {
      setError(`Payment amount cannot exceed ₹${formatCurrency(maxAmount)}`)
      return
    }

    setError('')
    await onConfirm(amount, mode, postDate)
  }

  const handleSetMax = () => {
    setPaymentAmount(maxAmount.toFixed(2))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] grid grid-rows-[auto_minmax(0,1fr)_auto] animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-3 rounded-t-lg">
          <div className="flex min-w-0 items-center gap-3">
            <Calculator className="w-6 h-6" />
            <h2 className="text-base sm:text-xl font-bold break-words">{title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="hover:bg-orange-700 p-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto overscroll-contain">
          {/* Customer Info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600 font-medium">Customer:</span>
                <p className="text-gray-900 font-semibold mt-1">{customerName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Loan Number:</span>
                <p className="text-gray-900 font-semibold mt-1">CD-{loanNumber || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Total Renewal Amount */}
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-gray-700 font-semibold">Total Renewal Amount:</span>
              <span className="text-2xl font-bold text-orange-600">
                ₹{formatCurrency(totalRenewalAmount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <span className="text-gray-600 font-medium block mb-1">Interest</span>
              <span className="text-gray-900 font-bold">₹{formatCurrency(interestAmount)}</span>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <span className="text-gray-600 font-medium block mb-1">Penalty</span>
              <span className="text-gray-900 font-bold">₹{formatCurrency(penaltyAmount)}</span>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <span className="text-gray-600 font-medium block mb-1">Current Principal</span>
              <span className="text-gray-900 font-bold">₹{formatCurrency(currentLoanAmount)}</span>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <span className="text-gray-600 font-medium block mb-1">Amount to Close</span>
              <span className="text-gray-900 font-bold">₹{formatCurrency(totalCloseAmount)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Closing / Renewal Date *</label>
            <input
              type="date"
              value={postDate}
              onChange={(e) => setPostDate(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-3 border-2 rounded-lg text-base font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 border-gray-300 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Payment Amount Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {amountLabel}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                ₹
              </span>
              <input
                type="text"
                value={paymentAmount}
                onChange={(e) => handlePaymentAmountChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                disabled={isLoading}
                className={`w-full pl-10 pr-24 py-3 border-2 rounded-lg text-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
              />
              <button
                onClick={handleSetMax}
                disabled={isLoading}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                MAX
              </button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <X className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>

          {/* Real-time Calculations (for partial mode) */}
          {paymentAmount && parseFloat(paymentAmount) > 0 && !error && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3 animate-fade-in">
              <h3 className="font-semibold text-blue-900 mb-2">Calculation Summary:</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded p-3 border border-blue-200">
                  <span className="text-blue-600 font-medium block mb-1">Deducted From Penalty:</span>
                  <span className="text-lg font-bold text-blue-900">
                    ₹{formatCurrency(allocation.penaltyPaid)}
                  </span>
                </div>
                <div className="bg-white rounded p-3 border border-blue-200">
                  <span className="text-blue-600 font-medium block mb-1">Deducted From Interest:</span>
                  <span className="text-lg font-bold text-blue-900">
                    ₹{formatCurrency(allocation.interestPaid)}
                  </span>
                </div>
                <div className="bg-white rounded p-3 border border-blue-200">
                  <span className="text-blue-600 font-medium block mb-1">Deducted From Principal:</span>
                  <span className="text-lg font-bold text-blue-900">
                    ₹{formatCurrency(principalPaid)}
                  </span>
                </div>
                <div className="bg-white rounded p-3 border border-blue-200">
                  <span className="text-blue-600 font-medium block mb-1">Unpaid Renewal:</span>
                  <span className="text-lg font-bold text-blue-900">
                    ₹{formatCurrency(unpaidRenewal)}
                  </span>
                </div>
              </div>
              <div className="bg-blue-100 rounded p-3 border border-blue-300">
                <span className="text-blue-700 font-medium block mb-2">New principal after this entry</span>
                <div className="flex items-center justify-between pt-2 border-t border-blue-300">
                  <span className="text-blue-600 font-medium">New Loan Amount:</span>
                  <span className="text-xl font-bold text-blue-900">
                    ₹{formatCurrency(newLoanAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              <span className="font-semibold">Note:</span> {note}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-4 sm:px-6 py-4 grid grid-cols-2 gap-3 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="h-11 w-full px-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !canConfirm}
            className="h-11 w-full px-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-center"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                {confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
