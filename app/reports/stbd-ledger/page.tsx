'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, RefreshCw, Printer } from 'lucide-react'
import { STBDLoan, Installment, LedgerTransaction } from '@/types'
import { format as formatDateFns } from 'date-fns'

export default function STBDLedgerPage() {
  const router = useRouter()
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [formData, setFormData] = useState<Partial<STBDLoan>>({
    date: new Date().toISOString().split('T')[0],
    loanType: 'STBD',
    loanAmount: 0,
    installmentAmount: 0,
    totalInstallments: 0,
    totalAmount: 0,
    lateFees: 0,
    totalPayable: 0,
  })
  const [installments, setInstallments] = useState<Installment[]>([])
  const [ledgerTransactions, setLedgerTransactions] = useState<LedgerTransaction[]>([])
  const [accounts, setAccounts] = useState<STBDLoan[]>([])
  const [activeTab, setActiveTab] = useState<'loan' | 'surity' | 'partner'>('loan')
  const [currentTime, setCurrentTime] = useState<string>('')

  useEffect(() => {
    fetchAccounts()
    // Set current time on client side only to avoid hydration mismatch
    setCurrentTime(new Date().toLocaleString())
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      fetchAccountDetails(selectedAccount)
      fetchInstallments(selectedAccount)
      fetchLedgerTransactions(selectedAccount)
    }
  }, [selectedAccount])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/loans?type=STBD')
      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.statusText}`)
      }
      const data = await response.json()
      if (data.error) {
        console.error('Error from API:', data.error)
        setAccounts([])
        return
      }
      setAccounts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
      setAccounts([])
    }
  }

  const fetchAccountDetails = async (accountId: string) => {
    try {
      const response = await fetch(`/api/loans/${accountId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch account details: ${response.statusText}`)
      }
      const data = await response.json()
      if (data.error) {
        console.error('Error from API:', data.error)
        return
      }
      
      // Ensure dates are properly formatted (YYYY-MM-DD)
      const formattedData = {
        ...data,
        date: data.date ? data.date.split('T')[0] : new Date().toISOString().split('T')[0],
        loanDate: data.loanDate ? data.loanDate.split('T')[0] : (data.date ? data.date.split('T')[0] : ''),
        dueDate: data.dueDate ? data.dueDate.split('T')[0] : '',
        lastDate: data.lastDate ? data.lastDate.split('T')[0] : '',
      }
      
      setFormData(formattedData)
    } catch (error) {
      console.error('Error fetching account details:', error)
    }
  }

  const fetchInstallments = async (accountId: string) => {
    try {
      const response = await fetch(`/api/loans/${accountId}/installments`)
      if (!response.ok) {
        throw new Error(`Failed to fetch installments: ${response.statusText}`)
      }
      const data = await response.json()
      if (data.error) {
        console.error('Error from API:', data.error)
        setInstallments([])
        return
      }
      setInstallments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching installments:', error)
      setInstallments([])
    }
  }

  const fetchLedgerTransactions = async (accountId: string) => {
    try {
      const response = await fetch(`/api/ledger/${accountId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch ledger: ${response.statusText}`)
      }
      const data = await response.json()
      if (data.error) {
        console.error('Error from API:', data.error)
        setLedgerTransactions([])
        return
      }
      setLedgerTransactions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching ledger:', error)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    try {
      const method = formData.id && selectedAccount ? 'PUT' : 'POST'
      const url = formData.id && selectedAccount 
        ? `/api/loans/${selectedAccount}` 
        : '/api/loans'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        alert('Account saved successfully!')
        fetchAccounts()
        if (!selectedAccount && formData.id) {
          setSelectedAccount(formData.id)
        }
      } else {
        const error = await response.json()
        alert(`Error saving account: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error saving account:', error)
      alert('Error saving account')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      return formatDateFns(date, 'dd-MMM-yy')
    } catch (error) {
      console.error('Error formatting date:', dateStr, error)
      return dateStr
    }
  }

  const handleRenewal = async () => {
    if (!selectedAccount || !formData.loanAmount || formData.loanAmount <= 0) {
      alert('Please select an account and ensure loan amount is valid')
      return
    }

    const renewalAmount = formData.totalPayable || formData.loanAmount || 0
    if (renewalAmount <= 0) {
      alert('Please enter a valid renewal amount')
      return
    }

    const confirmMessage = `Renew loan for ${formData.customerName || 'this account'}?\n\n` +
      `Renewal Amount: ₹${formatCurrency(renewalAmount)}\n\n` +
      `This will:\n` +
      `1. Record a payment transaction of ₹${formatCurrency(renewalAmount)}\n` +
      `2. Update loan dates (Date = Current Date, Due Date = Current Date + ${formData.totalInstallments || 12} months)\n` +
      `3. Reset installment calculations\n\n` +
      `Continue?`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const renewalDate = new Date().toISOString().split('T')[0]
      
      // Calculate new due date: renewal date + total installments (months)
      const installmentPeriod = formData.totalInstallments || formData.period || 12
      const renewalDateObj = new Date(renewalDate + 'T00:00:00')
      
      // Calculate due date from renewal date + installment period
      const newDueDateObj = new Date(renewalDateObj)
      newDueDateObj.setMonth(newDueDateObj.getMonth() + installmentPeriod)
      const newDueDate = newDueDateObj.toISOString().split('T')[0]

      // Step 1: Create payment transaction (debit entry)
      const transaction = {
        id: '',
        date: renewalDate,
        accountName: formData.customerName || `STBD-${formData.number || ''}`,
        particulars: `Loan Renewal - STBD-${formData.number || ''} - ${formData.customerName || ''}`,
        number: String(formData.number || ''),
        debit: renewalAmount,
        credit: 0,
        userName: 'RAMESH',
        entryTime: new Date().toISOString(),
      }

      const transactionResponse = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      })

      if (!transactionResponse.ok) {
        const error = await transactionResponse.json()
        throw new Error(error.error || 'Failed to create transaction')
      }

      // Step 2: Update loan with new dates - use 'date' field (main loan date)
      const updatedLoan = {
        ...formData,
        date: renewalDate, // Update main loan date
        loanDate: renewalDate, // Update STBD-specific loanDate
        dueDate: newDueDate,
        lastDate: newDueDate,
        period: installmentPeriod, // Ensure period is updated
      }

      const loanResponse = await fetch(`/api/loans/${selectedAccount}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLoan),
      })

      if (!loanResponse.ok) {
        const error = await loanResponse.json()
        throw new Error(error.error || 'Failed to update loan')
      }

      alert(`Loan renewed successfully!\n\nPayment recorded: ₹${formatCurrency(renewalAmount)}\nNew Loan Date: ${formatDate(renewalDate)}\nNew Due Date: ${formatDate(newDueDate)}`)
      
      // Refresh data
      await fetchAccountDetails(selectedAccount)
      await fetchInstallments(selectedAccount)
      await fetchLedgerTransactions(selectedAccount)
      await fetchAccounts()
    } catch (error: any) {
      console.error('Error renewing loan:', error)
      alert(`Error renewing loan: ${error.message || 'Unknown error'}`)
    }
  }

  const handleDocumentReturned = async () => {
    if (!selectedAccount) {
      alert('Please select an account first')
      return
    }

    const confirmMessage = `Mark documents as returned for ${formData.customerName || 'this account'}?\n\n` +
      `This will update the document status to "Returned" and mark the loan documents as returned.\n\n` +
      `Continue?`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      // Update form data with document returned status
      // Note: documentStatus and documentReturned are from Loan interface
      const updatedLoan = {
        ...formData,
        documentReturned: true,
        documentStatus: (formData as any).documentStatus || 'Returned',
      }

      const response = await fetch(`/api/loans/${selectedAccount}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLoan),
      })

      if (response.ok) {
        // Update local state
        // Note: documentStatus and documentReturned are from Loan interface
        setFormData(prev => ({
          ...prev,
          documentReturned: true,
          documentStatus: (prev as any).documentStatus || 'Returned',
        }))
        
        alert('Documents marked as returned successfully!')
        
        // Refresh account details to get updated data
        await fetchAccountDetails(selectedAccount)
      } else {
        const error = await response.json()
        alert(`Error updating document status: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating document status:', error)
      alert('Error updating document status')
    }
  }

  const handleCloseAccount = async () => {
    if (!selectedAccount || !formData.totalPayable || formData.totalPayable <= 0) {
      alert('Please select an account and ensure close amount is valid')
      return
    }

    const closeAmount = formData.totalPayable
    const confirmMessage = `Close loan account for ${formData.customerName || 'this account'}?\n\n` +
      `Total Amount to Close: ₹${formatCurrency(closeAmount)}\n\n` +
      `This will:\n` +
      `1. Record a payment transaction of ₹${formatCurrency(closeAmount)}\n` +
      `2. Mark the loan as closed\n\n` +
      `Continue?`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const closeDate = new Date().toISOString().split('T')[0]
      
      // Create payment transaction (debit entry)
      const transaction = {
        id: '',
        date: closeDate,
        accountName: formData.customerName || `STBD-${formData.number || ''}`,
        particulars: `Loan Closed - STBD-${formData.number || ''} - ${formData.customerName || ''}`,
        number: String(formData.number || ''),
        debit: closeAmount,
        credit: 0,
        userName: 'RAMESH',
        entryTime: new Date().toISOString(),
      }

      const transactionResponse = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      })

      if (!transactionResponse.ok) {
        const error = await transactionResponse.json()
        throw new Error(error.error || 'Failed to create transaction')
      }

      // Step 2: Update loan date to close date (optional - mark as closed)
      const updatedLoan = {
        ...formData,
        date: closeDate,
        lastDate: closeDate,
      }

      const loanResponse = await fetch(`/api/loans/${selectedAccount}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLoan),
      })

      if (!loanResponse.ok) {
        console.warn('Loan updated but transaction was recorded:', loanResponse)
      }

      alert(`Loan closed successfully!\n\nFinal payment recorded: ₹${formatCurrency(closeAmount)}\nClosed on: ${formatDate(closeDate)}`)
      
      // Refresh data
      await fetchAccountDetails(selectedAccount)
      await fetchLedgerTransactions(selectedAccount)
      await fetchAccounts()
    } catch (error: any) {
      console.error('Error closing loan:', error)
      alert(`Error closing loan: ${error.message || 'Unknown error'}`)
    }
  }

  const handlePrintReceipt = () => {
    if (!selectedAccount) {
      alert('Please select an account first')
      return
    }
    // Open print dialog for receipt
    window.print()
  }

  const creditTotal = ledgerTransactions.reduce((sum, t) => sum + t.credit, 0)
  const debitTotal = ledgerTransactions.reduce((sum, t) => sum + t.debit, 0)
  const balance = creditTotal - debitTotal

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-500 text-white shadow-lg">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="hover:bg-orange-600 p-2 rounded">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold">STBD LEDGER</h1>
            </div>
            <div className="text-right">
              <div className="text-sm">User Name: RAMESH</div>
              <div className="text-sm">{currentTime || 'Loading...'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="mb-4 flex items-center gap-4">
          <label className="text-sm font-medium">Today's Date:</label>
          <input
            type="date"
            value={formData.date || new Date().toISOString().split('T')[0]}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0]
              handleInputChange('date', today)
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-md text-sm"
          >
            Set Today
          </button>
          <button
            onClick={() => router.push('/reports/cd-ledger')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md"
          >
            Goto CD Ledger
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Account Entry Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Selection */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <label className="block text-sm font-medium mb-2">A/c Number</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.number} - {acc.customerName}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Inst. Paying Receipt No:</label>
                  <input
                    type="number"
                    value={formData.instPayingReceiptNo || 0}
                    onChange={(e) => handleInputChange('instPayingReceiptNo', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.customerName || ''}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">S/o W/o</label>
                  <input
                    type="text"
                    value={formData.fatherName || ''}
                    onChange={(e) => handleInputChange('fatherName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone No:</label>
                  <input
                    type="tel"
                    value={formData.phone1 || ''}
                    onChange={(e) => handleInputChange('phone1', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Guarantor</label>
                  <input
                    type="text"
                    value={formData.guarantor1?.name || ''}
                    onChange={(e) => handleInputChange('guarantor1', { ...formData.guarantor1, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Guarantor Address</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Guarantor Phone No:</label>
                  <input
                    type="tel"
                    value={formData.guarantor1?.phone || ''}
                    onChange={(e) => handleInputChange('guarantor1', { ...formData.guarantor1, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Partner:</label>
                  <input
                    type="text"
                    value={formData.partnerName || ''}
                    onChange={(e) => handleInputChange('partnerName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold mb-4">Financial Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Amount:</label>
                  <input
                    type="number"
                    value={formData.loanAmount || 0}
                    onChange={(e) => handleInputChange('loanAmount', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Installment:</label>
                  <input
                    type="number"
                    value={formData.installmentAmount || 0}
                    onChange={(e) => handleInputChange('installmentAmount', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Total:</label>
                  <input
                    type="number"
                    value={formData.totalInstallments || 0}
                    onChange={(e) => handleInputChange('totalInstallments', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Loan Date:</label>
                  <input
                    type="date"
                    value={formData.loanDate || formData.date || ''}
                    onChange={(e) => {
                      handleInputChange('loanDate', e.target.value)
                      // Also update main date field if loanDate is the primary date
                      if (!formData.date) {
                        handleInputChange('date', e.target.value)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Date:</label>
                  <input
                    type="date"
                    value={formData.lastDate || ''}
                    onChange={(e) => handleInputChange('lastDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date:</label>
                  <input
                    type="date"
                    value={formData.dueDate || ''}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  {formData.loanDate && formData.totalInstallments && !formData.dueDate && (
                    <button
                      onClick={() => {
                        // Calculate due date: loan date + total installments months
                        const loanDateObj = new Date(formData.loanDate + 'T00:00:00')
                        const dueDateObj = new Date(loanDateObj)
                        dueDateObj.setMonth(dueDateObj.getMonth() + (formData.totalInstallments || 12))
                        handleInputChange('dueDate', dueDateObj.toISOString().split('T')[0])
                      }}
                      className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Calculate from Loan Date + Installments
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Total Amount</label>
                  <input
                    type="number"
                    value={formData.totalAmount || 0}
                    onChange={(e) => handleInputChange('totalAmount', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Late Fees</label>
                  <input
                    type="number"
                    value={formData.lateFees || 0}
                    onChange={(e) => handleInputChange('lateFees', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Total Payable</label>
                  <input
                    type="number"
                    value={formData.totalPayable || 0}
                    onChange={(e) => handleInputChange('totalPayable', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md font-bold"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-4">
                <button
                  onClick={handlePrintReceipt}
                  disabled={!selectedAccount}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </button>
                <button
                  onClick={handleSave}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={handleRenewal}
                  disabled={!selectedAccount || !formData.totalPayable}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md"
                >
                  Renewal Account
                </button>
                <button
                  onClick={handleCloseAccount}
                  disabled={!selectedAccount || !formData.totalPayable}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md"
                >
                  Close Account
                </button>
                <button
                  onClick={() => {
                    fetchAccountDetails(selectedAccount)
                    fetchInstallments(selectedAccount)
                    fetchLedgerTransactions(selectedAccount)
                  }}
                  disabled={!selectedAccount}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Installment Details Table */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold mb-4">Installment Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-2 py-2 text-left border">S#</th>
                      <th className="px-2 py-2 text-left border">DueDate</th>
                      <th className="px-2 py-2 text-right border">InstallmentAmount</th>
                      <th className="px-2 py-2 text-right border">PaidAmount</th>
                      <th className="px-2 py-2 text-right border">DueAmount</th>
                      <th className="px-2 py-2 text-left border">PaidDate</th>
                      <th className="px-2 py-2 text-right border">Duedays</th>
                      <th className="px-2 py-2 text-right border">Penalty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-2 py-4 text-center text-gray-400 border">
                          No installments found
                        </td>
                      </tr>
                    ) : (
                      installments.map((inst) => (
                        <tr key={inst.sn} className="hover:bg-gray-50">
                          <td className="px-2 py-2 border">{inst.sn}</td>
                          <td className="px-2 py-2 border">{formatDate(inst.dueDate)}</td>
                          <td className="px-2 py-2 border text-right">{formatCurrency(inst.installmentAmount)}</td>
                          <td className="px-2 py-2 border text-right">{formatCurrency(inst.paidAmount)}</td>
                          <td className="px-2 py-2 border text-right">{formatCurrency(inst.dueAmount)}</td>
                          <td className="px-2 py-2 border">{inst.paidDate ? formatDate(inst.paidDate) : '-'}</td>
                          <td className="px-2 py-2 border text-right">{inst.dueDays}</td>
                          <td className="px-2 py-2 border text-right">{formatCurrency(inst.penalty)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Panel - Document Returned, Tabs and Ledger */}
          <div className="space-y-6">
            {/* Document Returned Button */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <button
                onClick={handleDocumentReturned}
                disabled={!selectedAccount || (formData as any).documentReturned}
                className={`w-full px-4 py-2 rounded-md font-semibold transition-colors ${
                  (formData as any).documentReturned
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                title={
                  (formData as any).documentReturned
                    ? 'Documents already marked as returned'
                    : 'Mark documents as returned to the customer'
                }
              >
                {(formData as any).documentReturned ? '✓ Documents Returned' : 'Document Returned'}
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow-md p-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('loan')}
                  className={`flex-1 px-4 py-2 rounded-md ${
                    activeTab === 'loan' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Loan Person
                </button>
                <button
                  onClick={() => setActiveTab('surity')}
                  className={`flex-1 px-4 py-2 rounded-md ${
                    activeTab === 'surity' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Surity Person
                </button>
                <button
                  onClick={() => setActiveTab('partner')}
                  className={`flex-1 px-4 py-2 rounded-md ${
                    activeTab === 'partner' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Partner
                </button>
              </div>
            </div>

            {/* Credit/Debit Ledger Table */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-bold mb-4">Credit/Debit Ledger</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-2 py-2 text-left border">Date</th>
                      <th className="px-2 py-2 text-right border">Credit</th>
                      <th className="px-2 py-2 text-right border">Debit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-2 py-4 text-center text-gray-400 border">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      ledgerTransactions.map((transaction, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-2 py-2 border">{formatDate(transaction.date)}</td>
                          <td className="px-2 py-2 border text-right">{formatCurrency(transaction.credit)}</td>
                          <td className="px-2 py-2 border text-right">{formatCurrency(transaction.debit)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td className="px-2 py-2 border">Total:</td>
                      <td className="px-2 py-2 border text-right">{formatCurrency(creditTotal)}</td>
                      <td className="px-2 py-2 border text-right">{formatCurrency(debitTotal)}</td>
                    </tr>
                    <tr className="bg-orange-50 font-bold">
                      <td className="px-2 py-2 border">Balance:</td>
                      <td colSpan={2} className="px-2 py-2 border text-right">{formatCurrency(balance)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


