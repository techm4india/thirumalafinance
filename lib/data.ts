import { Loan, Transaction, Partner, DailyReport, DayBookEntry } from '@/types';
import { supabase } from './supabase';

// Helper function to convert database loan to Loan type
function mapLoanFromDb(dbLoan: any): Loan {
  return {
    id: dbLoan.id,
    number: dbLoan.number,
    date: dbLoan.date,
    loanType: dbLoan.loan_type,
    customerName: dbLoan.customer_name,
    fatherName: dbLoan.father_name,
    aadhaar: dbLoan.aadhaar,
    cNo: dbLoan.c_no,
    address: dbLoan.address,
    phone1: dbLoan.phone1,
    phone2: dbLoan.phone2,
    guarantor1: dbLoan.guarantor1_name ? {
      name: dbLoan.guarantor1_name,
      aadhaar: dbLoan.guarantor1_aadhaar,
      phone: dbLoan.guarantor1_phone,
    } : undefined,
    guarantor2: dbLoan.guarantor2_name ? {
      name: dbLoan.guarantor2_name,
      aadhaar: dbLoan.guarantor2_aadhaar,
      phone: dbLoan.guarantor2_phone,
    } : undefined,
    particulars: dbLoan.particulars,
    loanAmount: parseFloat(dbLoan.loan_amount),
    rateOfInterest: dbLoan.rate_of_interest ? parseFloat(dbLoan.rate_of_interest) : undefined,
    period: dbLoan.period,
    documentCharges: dbLoan.document_charges ? parseFloat(dbLoan.document_charges) : undefined,
    partnerId: dbLoan.partner_id,
    partnerName: dbLoan.partner_name,
    userName: dbLoan.user_name,
    entryTime: dbLoan.entry_time,
    customerImageUrl: dbLoan.customer_image_url,
    guarantor1ImageUrl: dbLoan.guarantor1_image_url,
    guarantor2ImageUrl: dbLoan.guarantor2_image_url,
    partnerImageUrl: dbLoan.partner_image_url,
    documents: safeJson(dbLoan.documents),
    location: safeJson(dbLoan.location),
    description: dbLoan.description || undefined,
    extraFeatures: dbLoan.extra_features || undefined,
  };
}

function safeJson<T = any>(raw: any): T | undefined {
  if (!raw) return undefined
  if (typeof raw === 'object') return raw as T
  try { return JSON.parse(String(raw)) as T } catch { return undefined }
}

// Helper function to convert Loan type to database format
function mapLoanToDb(loan: Loan): any {
  const loanData: any = {
    number: loan.number,
    date: loan.date,
    loan_type: loan.loanType,
    customer_name: loan.customerName,
    father_name: loan.fatherName || null,
    aadhaar: loan.aadhaar || null,
    c_no: loan.cNo || null,
    address: loan.address,
    phone1: loan.phone1 || null,
    phone2: loan.phone2 || null,
    guarantor1_name: loan.guarantor1?.name || null,
    guarantor1_aadhaar: loan.guarantor1?.aadhaar || null,
    guarantor1_phone: loan.guarantor1?.phone || null,
    guarantor2_name: loan.guarantor2?.name || null,
    guarantor2_aadhaar: loan.guarantor2?.aadhaar || null,
    guarantor2_phone: loan.guarantor2?.phone || null,
    particulars: loan.particulars || null,
    loan_amount: loan.loanAmount,
    rate_of_interest: loan.rateOfInterest || null,
    document_charges: loan.documentCharges || null,
    partner_id: loan.partnerId || null,
    partner_name: loan.partnerName || null,
    user_name: loan.userName,
    entry_time: loan.entryTime,
    customer_image_url: loan.customerImageUrl || null,
    guarantor1_image_url: loan.guarantor1ImageUrl || null,
    guarantor2_image_url: loan.guarantor2ImageUrl || null,
    partner_image_url: loan.partnerImageUrl || null,
    documents: loan.documents ? loan.documents : null,
    location: loan.location ? loan.location : null,
    description: loan.description || null,
    extra_features: loan.extraFeatures || null,
  };
  
  // Only include ID if it's a valid UUID (for updates)
  // For new loans, let the database generate the UUID
  if (loan.id && loan.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    loanData.id = loan.id;
  }
  
  // Period is optional in form but required in DB - use 0 as default if not provided
  loanData.period = loan.period !== undefined && loan.period !== null ? loan.period : 0;
  
  return loanData;
}

// Helper function to convert database transaction to Transaction type
function mapTransactionFromDb(dbTransaction: any): Transaction {
  return {
    id: dbTransaction.id,
    date: dbTransaction.date,
    accountName: dbTransaction.account_name,
    particulars: dbTransaction.particulars,
    rno: dbTransaction.rno,
    number: dbTransaction.number,
    credit: parseFloat(dbTransaction.credit),
    debit: parseFloat(dbTransaction.debit),
    userName: dbTransaction.user_name,
    entryTime: dbTransaction.entry_time,
    transactionType: dbTransaction.transaction_type,
  };
}

// Helper function to convert Transaction type to database format
function mapTransactionToDb(transaction: Transaction): any {
  const transactionData: any = {
    date: transaction.date,
    account_name: transaction.accountName,
    particulars: transaction.particulars,
    rno: transaction.rno || null,
    number: transaction.number || null,
    credit: transaction.credit,
    debit: transaction.debit,
    user_name: transaction.userName,
    entry_time: transaction.entryTime,
    transaction_type: transaction.transactionType || 'cash_book_entry', // Default to cash_book_entry
  };
  
  // Only include ID if it's a valid UUID (for updates)
  // For new transactions, let the database generate the UUID
  if (transaction.id && transaction.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    transactionData.id = transaction.id;
  }
  
  return transactionData;
}

export async function getLoans(): Promise<Loan[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('is_deleted', false)
    .order('date', { ascending: false });

  if (error) {
    console.error('Supabase error fetching loans:', error);
    if (
      error.code === 'PGRST116' ||
      error.message?.includes('relation') ||
      error.message?.includes('does not exist')
    ) {
      throw new Error(
        'Loans table is missing or inaccessible. Apply your Supabase schema/migrations.'
      );
    }
    throw error;
  }
  return (data || []).map(mapLoanFromDb);
}

export async function saveLoan(loan: Loan): Promise<Loan> {
  const loanData = mapLoanToDb(loan);

  async function attempt(payload: any) {
    return payload.id
      ? supabase.from('loans').upsert(payload, { onConflict: 'id' }).select().single()
      : supabase.from('loans').insert(payload).select().single();
  }

  // Retry without the new columns if they don't exist in the DB yet.
  let { data, error } = await attempt(loanData);
  if (error && /(documents|location|description|extra_features)/.test(error.message || '')) {
    const stripped = { ...loanData };
    delete stripped.documents;
    delete stripped.location;
    delete stripped.description;
    delete stripped.extra_features;
    ({ data, error } = await attempt(stripped));
  }
  if (error) {
    console.error('Error saving loan:', error);
    throw error;
  }
  return data ? mapLoanFromDb(data) : loan;
}

export async function deleteLoan(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('loans')
      .update({ 
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting loan:', error);
    throw error;
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('is_deleted', false)
    .order('date', { ascending: false })
    .order('entry_time', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapTransactionFromDb);
}

export async function saveTransaction(transaction: Transaction): Promise<void> {
  try {
    const transactionData = mapTransactionToDb(transaction);
    
    const { error } = await supabase
      .from('transactions')
      .insert(transactionData);

    if (error) throw error;
  } catch (error) {
    console.error('Error saving transaction:', error);
    throw error;
  }
}

export async function getPartners(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    phone: p.phone,
    address: p.address,
    partnerId: p.partner_id,
    isMD: p.is_md || false,
    mdName: p.md_name,
    village: p.village,
    homePhone: p.home_phone,
  }));
}

export async function savePartner(partner: Partner): Promise<void> {
  try {
    // Auto-generate partner ID if not provided
    let partnerId = partner.partnerId;
    if (!partnerId || partnerId <= 0) {
      partnerId = await getNextPartnerId();
    }

    const partnerData: any = {
      name: partner.name,
      phone: partner.phone || null,
      address: partner.address || null,
      partner_id: partnerId,
      is_md: partner.isMD || false,
      md_name: partner.mdName || null,
      village: partner.village || null,
      home_phone: partner.homePhone || null,
    };
    
    // If partner has an id, include it for update; otherwise let database generate it
    if (partner.id) {
      partnerData.id = partner.id;
    }
    
    const { error } = await supabase
      .from('partners')
      .upsert(partnerData, { onConflict: partner.id ? 'id' : undefined });
    
    // Update the partner object with the generated ID
    partner.partnerId = partnerId;

    if (error) throw error;
  } catch (error) {
    console.error('Error saving partner:', error);
    throw error;
  }
}

export async function getCustomers(): Promise<any[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('customer_id', { ascending: true });

  if (error) {
    console.error('Supabase error fetching customers:', error);
    if (
      error.code === 'PGRST116' ||
      error.message?.includes('relation') ||
      error.message?.includes('does not exist')
    ) {
      throw new Error(
        'Customers table is missing or inaccessible. Apply your Supabase schema/migrations.'
      );
    }
    throw error;
  }
  return (data || []).map((c: any) => ({
    id: c.id,
    customerId: c.customer_id,
    aadhaar: c.aadhaar,
    name: c.name,
    father: c.father,
    address: c.address,
    village: c.village,
    mandal: c.mandal,
    district: c.district,
    phone1: c.phone1,
    phone2: c.phone2,
    imageUrl: c.image_url,
  }));
}

export async function getNextCustomerId(): Promise<number> {
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id')
    .order('customer_id', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching max customer ID:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return 1;
  }

  const maxId = data[0].customer_id || 0;
  return maxId + 1;
}

export async function getNextGuarantorId(): Promise<number> {
  const { data, error } = await supabase
    .from('guarantors')
    .select('guarantor_id')
    .order('guarantor_id', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching max guarantor ID:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return 1;
  }

  const maxId = data[0].guarantor_id || 0;
  return maxId + 1;
}

export async function getNextPartnerId(): Promise<number> {
  const { data, error } = await supabase
    .from('partners')
    .select('partner_id')
    .order('partner_id', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching max partner ID:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return 1;
  }

  const maxId = data[0].partner_id || 0;
  return maxId + 1;
}

export async function getNextLoanNumber(): Promise<number> {
  const { data, error } = await supabase
    .from('loans')
    .select('number')
    .eq('is_deleted', false)
    .order('number', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching max loan number:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return 1;
  }

  const maxNumber = data[0].number || 0;
  return maxNumber + 1;
}

export async function saveCustomer(customer: any): Promise<void> {
  try {
    // Auto-generate customer ID if not provided
    let customerId = customer.customerId;
    if (!customerId || customerId <= 0) {
      customerId = await getNextCustomerId();
    }

    const customerData: any = {
      customer_id: customerId,
      aadhaar: customer.aadhaar || null,
      name: customer.name,
      father: customer.father || null,
      address: customer.address,
      village: customer.village || null,
      mandal: customer.mandal || null,
      district: customer.district || null,
      phone1: customer.phone1 || null,
      phone2: customer.phone2 || null,
    };

    // Only include image_url if the column exists (to avoid errors during migration)
    if (customer.imageUrl !== undefined) {
      customerData.image_url = customer.imageUrl || null;
    }

    if (customer.id) {
      customerData.id = customer.id;
    }

    const { error } = await supabase
      .from('customers')
      .upsert(customerData, { onConflict: customer.id ? 'id' : 'customer_id' });
    
    // Update the customer object with the generated ID
    customer.customerId = customerId;

    if (error) throw error;
  } catch (error: any) {
    console.error('Error saving customer:', error);
    
    // Enhance network errors with more context
    const errorMessage = error.message || ''
    const errorDetails = error.toString() || ''
    if (errorMessage.includes('fetch failed') || errorMessage.includes('ENOTFOUND') || errorDetails.includes('ENOTFOUND')) {
      const enhancedError = new Error(
        `Database connection failed: Unable to reach Supabase. ${errorMessage}`
      ) as any
      enhancedError.details = errorDetails
      enhancedError.code = 'DATABASE_CONNECTION_ERROR'
      throw enhancedError
    }
    
    throw error;
  }
}

export async function getDailyReport(date: string): Promise<DailyReport> {
  try {
    if (!date) {
      throw new Error('Date is required');
    }

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('date', date)
      .eq('is_deleted', false)
      .order('entry_time', { ascending: true });

    if (error) throw error;

    const transactionList = (transactions || []).map(mapTransactionFromDb);
    
    const accountSummary: { [key: string]: { credit: number; debit: number } } = {};
    
    transactionList.forEach((t: Transaction) => {
      if (!accountSummary[t.accountName]) {
        accountSummary[t.accountName] = { credit: 0, debit: 0 };
      }
      accountSummary[t.accountName].credit += (t.credit || 0);
      accountSummary[t.accountName].debit += (t.debit || 0);
    });

    const creditTotal = transactionList.reduce((sum: number, t: Transaction) => sum + (t.credit || 0), 0);
    const debitTotal = transactionList.reduce((sum: number, t: Transaction) => sum + (t.debit || 0), 0);

    // Calculate opening balance (sum of all previous transactions)
    const { data: allTransactions, error: allError } = await supabase
      .from('transactions')
      .select('*')
      .eq('is_deleted', false)
      .order('date', { ascending: true })
      .order('entry_time', { ascending: true });

    if (allError) throw allError;

    const allTransactionList = (allTransactions || []).map(mapTransactionFromDb);
    const previousTransactions = allTransactionList.filter((t: Transaction) => t.date < date);
    const openingBalance = previousTransactions.reduce((sum: number, t: Transaction) => {
      return sum + ((t.credit || 0) - (t.debit || 0));
    }, 0);

    const closingBalance = openingBalance + creditTotal - debitTotal;
    const grandTotal = closingBalance;

    return {
      date,
      transactions: transactionList,
      accountSummary: Object.entries(accountSummary).map(([accountName, totals]) => ({
        accountName,
        credit: totals.credit || 0,
        debit: totals.debit || 0,
      })),
      creditTotal: creditTotal || 0,
      debitTotal: debitTotal || 0,
      openingBalance: openingBalance || 0,
      closingBalance: closingBalance || 0,
      grandTotal: grandTotal || 0,
    };
  } catch (error) {
    console.error('Error fetching daily report:', error);
    throw error;
  }
}

export async function getDayBook(date: string): Promise<DayBookEntry[]> {
  // Ensure date is in YYYY-MM-DD format
  let formattedDate = date.split('T')[0]; // Remove time if present

  if (formattedDate.length !== 10) {
    const dateObj = new Date(formattedDate);
    if (!isNaN(dateObj.getTime())) {
      formattedDate = dateObj.toISOString().split('T')[0];
    }
  }

  console.log('Fetching day book for date:', formattedDate);

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('date', formattedDate)
    .eq('is_deleted', false)
    .order('entry_time', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Supabase error fetching day book:', error);
    throw error;
  }

  console.log(`Found ${transactions?.length || 0} transactions for date ${formattedDate}`);

  if (!transactions || transactions.length === 0) {
    return [];
  }

  const entries = transactions.map((t: any, index: number) => ({
    sn: index + 1,
    headOfAccount: t.account_name || t.accountName || '',
    particulars: t.particulars || '',
    number: t.number || t.rno || '',
    credit: Math.max(0, parseFloat(t.credit || 0)),
    debit: Math.max(0, parseFloat(t.debit || 0)),
  }));

  return entries;
}

export async function getGuarantors(): Promise<any[]> {
  const { data, error } = await supabase
    .from('guarantors')
    .select('*')
    .order('guarantor_id', { ascending: true });

  if (error) {
    console.error('Supabase error fetching guarantors:', error);
    if (
      error.code === 'PGRST116' ||
      error.message?.includes('relation') ||
      error.message?.includes('does not exist')
    ) {
      throw new Error(
        'Guarantors table is missing or inaccessible. Apply your Supabase schema/migrations.'
      );
    }
    throw error;
  }
  return (data || []).map((g: any) => ({
    id: g.id,
    guarantorId: g.guarantor_id,
    aadhaar: g.aadhaar,
    name: g.name,
    father: g.father,
    address: g.address,
    village: g.village,
    mandal: g.mandal,
    district: g.district,
    phone1: g.phone1,
    phone2: g.phone2,
    imageUrl: g.image_url,
  }));
}

export async function saveGuarantor(guarantor: any): Promise<void> {
  try {
    // Auto-generate guarantor ID if not provided
    let guarantorId = guarantor.guarantorId;
    if (!guarantorId || guarantorId <= 0) {
      guarantorId = await getNextGuarantorId();
    }

    const guarantorData: any = {
      guarantor_id: guarantorId,
      aadhaar: guarantor.aadhaar || null,
      name: guarantor.name,
      father: guarantor.father || null,
      address: guarantor.address,
      village: guarantor.village || null,
      mandal: guarantor.mandal || null,
      district: guarantor.district || null,
      phone1: guarantor.phone1 || null,
      phone2: guarantor.phone2 || null,
    };

    if (guarantor.imageUrl !== undefined) {
      guarantorData.image_url = guarantor.imageUrl || null;
    }

    if (guarantor.id) {
      guarantorData.id = guarantor.id;
    }

    const { error } = await supabase
      .from('guarantors')
      .upsert(guarantorData, { onConflict: guarantor.id ? 'id' : 'guarantor_id' });
    
    // Update the guarantor object with the generated ID
    guarantor.guarantorId = guarantorId;

    if (error) throw error;
  } catch (error) {
    console.error('Error saving guarantor:', error);
    throw error;
  }
}
