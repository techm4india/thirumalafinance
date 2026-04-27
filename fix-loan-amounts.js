// Run with: node fix-loan-amounts.js
// Fixes all loan_amount values that should be round numbers (399999 -> 400000 etc)

const { createClient } = require('@supabase/supabase-js')

const url = 'https://bjtgqsolrpfdvmikgiog.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdGdxc29scnBmZHZtaWtnaW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MDA1MjMsImV4cCI6MjA4MTQ3NjUyM30.CI0upZHj7iwdCh3Hy-rbdbpzmMOvOpeIuXPKPa0gycg'

const sb = createClient(url, key)

async function fix() {
  const { data: loans, error } = await sb
    .from('loans')
    .select('id, number, customer_name, loan_type, loan_amount')
    .eq('is_deleted', false)

  if (error) { console.error(error); return }

  console.log(`Total loans: ${loans.length}`)

  // Fix 399999 -> 400000 pattern: round to nearest 1000 if within 1000 of a round number
  let fixed = 0
  for (const l of loans) {
    const amt = Number(l.loan_amount)
    const rounded1000 = Math.round(amt / 1000) * 1000
    // Only fix if difference is small (within 10 Rs) - clearly a data entry typo
    if (Math.abs(amt - rounded1000) <= 10 && amt !== rounded1000) {
      console.log(`  Fixing #${l.number} ${l.customer_name}: ${amt} -> ${rounded1000}`)
      await sb.from('loans').update({ loan_amount: rounded1000 }).eq('id', l.id)
      fixed++
    }
  }

  console.log(`Fixed ${fixed} loan(s).`)
}

fix()
