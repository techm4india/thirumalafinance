'use client'

import { useState, useEffect } from 'react'
import { 
  FileText, 
  Edit, 
  Users, 
  Search as SearchIcon, 
  Calculator as CalculatorIcon, 
  DollarSign,
  BookOpen,
  BarChart3,
  TrendingUp,
  UserPlus,
  CreditCard,
  Receipt,
  Calendar,
  Book
} from 'lucide-react'

type MenuItem = {
  name: string
  icon: any
  path: string
}

export default function Home() {
  const [currentDate, setCurrentDate] = useState<string>('')
  const [activeView, setActiveView] = useState<string | null>('/loans/new')

  // Set date only on client side to avoid hydration mismatch
  useEffect(() => {
    const date = new Date()
    const formatted = date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: '2-digit' 
    }).replace(/ /g, '-')
    setCurrentDate(formatted)
  }, [])

  const newEntries: MenuItem[] = [
    { name: 'Loans Entry Form', icon: FileText, path: '/loans/new' },
    { name: 'Edit', icon: Edit, path: '/loans/edit' },
    { name: 'New Partner Entry', icon: UserPlus, path: '/partners/new' },
    { name: 'Partners', icon: Users, path: '/partners' },
    { name: 'New Customer Entry', icon: UserPlus, path: '/customers/new' },
    { name: 'New Guarantor Entry', icon: UserPlus, path: '/guarantors/new' },
    { name: 'Cash Book Entry Form', icon: Book, path: '/cashbook' },
    { name: 'Search', icon: SearchIcon, path: '/search' },
    { name: 'Aadhaar Search', icon: SearchIcon, path: '/search/aadhaar' },
    { name: 'Calculator', icon: CalculatorIcon, path: '/calculator' },
    { name: 'Capital Entry form', icon: DollarSign, path: '/capital' },
  ]

  const reports: MenuItem[] = [
    { name: 'Day Book', icon: BookOpen, path: '/reports/daybook' },
    { name: 'General Ledger', icon: FileText, path: '/reports/ledger' },
    { name: 'Phone Numbers Edit Form', icon: FileText, path: '/reports/phone-numbers' },
    { name: 'Daily Report', icon: Calendar, path: '/reports/daily' },
    { name: 'Profit and Loss', icon: TrendingUp, path: '/reports/profit-loss' },
    { name: 'Final Statement', icon: BarChart3, path: '/reports/statement' },
    { name: 'Business Details', icon: BarChart3, path: '/reports/business' },
    { name: 'Partner Performance', icon: Users, path: '/reports/partner-performance' },
    { name: 'New Customers', icon: UserPlus, path: '/reports/new-customers' },
    { name: 'CD Ledger', icon: CreditCard, path: '/reports/cd-ledger' },
    { name: 'STBD Ledger', icon: Receipt, path: '/reports/stbd-ledger' },
    { name: 'HP Ledger', icon: Receipt, path: '/reports/hp-ledger' },
    { name: 'TBD Ledger', icon: Receipt, path: '/reports/tbd-ledger' },
    { name: 'Dues List', icon: FileText, path: '/reports/dues' },
    { name: 'Edited Deleted Records', icon: FileText, path: '/reports/edited-deleted' },
  ]

  const allMenuItems = [
    { section: 'New Entries', items: newEntries },
    { section: 'Reports', items: reports },
  ]

  const handleMenuClick = (item: MenuItem) => {
    setActiveView(item.path)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col">
      {/* Header */}
      <div className="bg-orange-500 text-white shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">TIRUMALA FINANCE</h1>
            <div className="text-right">
              <div className="text-sm opacity-90">Admin</div>
              <div className="text-lg font-semibold">Date: {currentDate || 'Loading...'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-white shadow-lg overflow-y-auto">
          <div className="p-4">
            {allMenuItems.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-6">
                <h2 className="text-lg font-bold text-gray-800 mb-3 px-2">
                  {section.section}
                </h2>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = activeView === item.path
                    return (
                      <button
                        key={item.name}
                        onClick={() => handleMenuClick(item)}
                        className={`w-full font-medium py-2.5 px-3 rounded-md transition-all duration-200 flex items-center gap-3 border text-left ${
                          isActive
                            ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                            : 'bg-white hover:bg-orange-50 text-gray-800 border-gray-200 hover:border-orange-300 hover:shadow-sm'
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-orange-500'}`} />
                        <span className="text-sm">{item.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {activeView && (
            <div className="h-full w-full">
              <iframe
                src={activeView}
                className="w-full h-full border-0"
                title="Content Frame"
                style={{ minHeight: '100%' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-orange-500 text-white">
        <div className="px-6 py-4 text-center">
          <p className="text-sm">Gaimel, Dist: Siddipet, Telangana</p>
        </div>
      </div>
    </div>
  )
}



