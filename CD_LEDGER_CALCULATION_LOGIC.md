# CD Ledger Calculation Logic

This document explains all the calculation formulas used in the CD Ledger form.

## Key Principles

1. **Single "Today" Date**: All calculations use the same "today" date (actual current date) for consistency
2. **Original Loan Date**: Interest is calculated from the original loan date (from database) to today
3. **Daily Interest Formula**: Uses simple interest calculation based on days

---

## Calculation Formulas

### 1. **Due Days** (Overdue Days Calculation)
```
Due Days = Today - Due Date

Formula in code:
  diffTime = today.getTime() - dueDate.getTime()
  dueDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

Result:
  - Positive value: Days overdue (loan is past due)
  - Negative value: Days remaining until due (loan not yet due)
  - Zero: Due today

Example:
  Today: 2025-12-20
  Due Date: 2022-08-29
  Due Days = 1237 days overdue
```

---

### 2. **Amount Paid**
```
Amount Paid = Sum of all debit transactions from ledger

Formula in code:
  amountPaid = transactions.reduce((sum, t) => sum + t.debit, 0)

This is calculated from the transaction ledger (all debit entries)
```

---

### 3. **Period Days** (For Interest Calculation)
```
Period Days = Today - Loan Date (in days)

Formula in code:
  diffTime = today.getTime() - loanDate.getTime()
  periodDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))

Important:
  - Uses original loan date from database
  - Always positive (cannot be negative)
  - Uses Math.floor to get exact days (not rounding up)

Example:
  Loan Date: 2022-07-30
  Today: 2025-12-20
  Period Days = 1269 days
```

---

### 4. **Present Interest** (Interest from Loan Date to Today)
```
Present Interest = (Loan Amount × Rate × Period Days) / (100 × 365)

Formula in code:
  presentInterest = (loan.loanAmount * rate * periodDays) / (100 * 365)

Where:
  - Loan Amount: Principal amount
  - Rate: Interest rate percentage (e.g., 3 means 3%)
  - Period Days: Days from loan date to today
  - 365: Days in a year (for annual rate calculation)

Example:
  Loan Amount: ₹500,000
  Rate: 3%
  Period Days: 1269 days
  Present Interest = (500000 × 3 × 1269) / (100 × 365)
                   = 1,903,500,000 / 36,500
                   = ₹52,068.49

Daily Interest Rate:
  Daily Rate = (Rate / 100) / 365 = Rate / 36,500
  Present Interest = Loan Amount × Daily Rate × Period Days
```

---

### 5. **Total Balance** (Principal + Interest - Payments)
```
Total Balance = Loan Amount + Present Interest - Amount Paid

Formula in code:
  totalBalance = loan.loanAmount + presentInterest - amountPaid

This shows the current outstanding balance including accrued interest.

Example:
  Loan Amount: ₹500,000
  Present Interest: ₹52,068.49
  Amount Paid: ₹0
  Total Balance = 500,000 + 52,068.49 - 0 = ₹552,068.49
```

---

### 6. **Overdue Days** (For Penalty Calculation)
```
Overdue Days = Today - Due Date (only if overdue, else 0)

Formula in code:
  overdueDiff = today.getTime() - dueDate.getTime()
  overdueDays = Math.max(0, Math.floor(overdueDiff / (1000 * 60 * 60 * 24)))

Important:
  - Only positive if overdue (today > due date)
  - Zero if not yet due (today <= due date)
  - Uses Math.floor (not Math.round) for consistency

Example:
  Today: 2025-12-20
  Due Date: 2022-08-29
  Overdue Days = 1237 days
```

---

### 7. **Penalty** (Interest on Overdue Period)
```
Penalty = (Loan Amount × Rate × Overdue Days) / (100 × 365)

Formula in code:
  if (overdueDays > 0 && loan.loanAmount > 0) {
    penalty = (loan.loanAmount * rate * overdueDays) / (100 * 365)
  }

Where:
  - Loan Amount: Principal amount
  - Rate: Same interest rate as loan (e.g., 3%)
  - Overdue Days: Days past due date (only if overdue)
  - 365: Days in a year

Important:
  - Penalty only applies if overdue (overdueDays > 0)
  - Uses same rate as loan interest rate
  - Calculated daily on the principal

Example:
  Loan Amount: ₹500,000
  Rate: 3%
  Overdue Days: 1237 days
  Penalty = (500000 × 3 × 1237) / (100 × 365)
          = 1,855,500,000 / 36,500
          = ₹50,835.62
```

---

### 8. **Total Amount for Renewal** (Interest + Penalty - Amount Paid)
```
Total Amt for Renewal = Present Interest + Penalty - Amount Paid

Formula in code:
  totalAmtForRenewal = presentInterest + penalty - amountPaid

Important:
  - Principal is NOT included (rolls over to new loan)
  - Customer pays only interest + penalty
  - Amount Paid is subtracted (any partial payments)

Example:
  Present Interest: ₹52,068.49
  Penalty: ₹50,835.62
  Amount Paid: ₹0
  Total Amt for Renewal = 52,068.49 + 50,835.62 - 0 = ₹102,904.11
```

---

### 9. **Total Amount for Close** (Full Settlement)
```
Total Amt for Close = Loan Amount + Present Interest + Penalty - Amount Paid

Formula in code:
  totalAmtForClose = loan.loanAmount + presentInterest + penalty - amountPaid

Important:
  - Principal IS included (full settlement)
  - Customer pays principal + interest + penalty
  - Amount Paid is subtracted (any partial payments)

Example:
  Loan Amount: ₹500,000
  Present Interest: ₹52,068.49
  Penalty: ₹50,835.62
  Amount Paid: ₹0
  Total Amt for Close = 500,000 + 52,068.49 + 50,835.62 - 0 = ₹602,904.11
```

---

## Calculation Flow

```
1. Get "Today" Date (actual current date)
   ↓
2. Parse Loan Date (from database - original loan date)
   ↓
3. Parse Due Date (from form)
   ↓
4. Calculate Due Days = Today - Due Date
   ↓
5. Calculate Period Days = Today - Loan Date
   ↓
6. Calculate Present Interest = (Principal × Rate × Period Days) / (100 × 365)
   ↓
7. Calculate Amount Paid = Sum of debits from ledger
   ↓
8. Calculate Total Balance = Principal + Interest - Amount Paid
   ↓
9. Calculate Overdue Days = Today - Due Date (if overdue)
   ↓
10. Calculate Penalty = (Principal × Rate × Overdue Days) / (100 × 365)
   ↓
11. Calculate Total for Renewal = Interest + Penalty - Amount Paid
   ↓
12. Calculate Total for Close = Principal + Interest + Penalty - Amount Paid
```

---

## Key Points

1. **All calculations use the same "Today" date** - ensures consistency between all fields
2. **Interest calculation uses original loan date** - interest accrues from loan start date
3. **Penalty calculation uses due date** - penalty only applies after due date
4. **Daily interest formula** - divides annual rate by 365 days
5. **Rounding** - All final values are rounded to 2 decimal places using `Math.round(value * 100) / 100`

---

## Example Calculation Summary

Given:
- Loan Amount: ₹500,000
- Rate: 3% (0.03)
- Loan Date: 2022-07-30
- Due Date: 2022-08-29
- Today: 2025-12-20 (example)
- Amount Paid: ₹0

Calculated:
- Period Days: 1269 days (from loan date to today)
- Due Days: 1237 days (from due date to today - overdue)
- Overdue Days: 1237 days (same as due days, since overdue)

Results:
- Present Interest = (500,000 × 3 × 1269) / 36,500 = ₹52,068.49
- Penalty = (500,000 × 3 × 1237) / 36,500 = ₹50,835.62
- Total Balance = 500,000 + 52,068.49 - 0 = ₹552,068.49
- Total for Renewal = 52,068.49 + 50,835.62 - 0 = ₹102,904.11
- Total for Close = 500,000 + 52,068.49 + 50,835.62 - 0 = ₹602,904.11
