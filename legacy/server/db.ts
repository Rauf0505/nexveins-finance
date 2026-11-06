import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'nexveins_finance.db');
export const db = new Database(dbPath);

// Enable WAL mode and foreign keys for high concurrency & transactional integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- Organizations (Tenants)
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      legal_name TEXT,
      tax_id TEXT,
      base_currency TEXT NOT NULL DEFAULT 'PKR',
      country TEXT NOT NULL DEFAULT 'Pakistan',
      fiscal_year_start_month INTEGER NOT NULL DEFAULT 7, -- July for Pakistan (July-June)
      enabled_modules TEXT NOT NULL DEFAULT '["sales","purchases","banking","projects","payroll","equity","assets","taxation","budgets","integrations"]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      avatar_url TEXT,
      global_role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Organization Memberships & RBAC
    CREATE TABLE IF NOT EXISTS organization_memberships (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'accountant', -- 'admin', 'finance_manager', 'accountant', 'ar_officer', 'ap_officer', 'project_manager', 'hr_officer', 'auditor', 'executive'
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(organization_id, user_id)
    );

    -- Fiscal Periods
    CREATE TABLE IF NOT EXISTS fiscal_periods (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_locked INTEGER NOT NULL DEFAULT 0,
      closed_at TEXT,
      closed_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- Chart of Accounts
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
      sub_type TEXT NOT NULL, -- 'cash_and_bank', 'accounts_receivable', 'current_asset', 'fixed_asset', 'accounts_payable', 'current_liability', 'partner_capital', 'retained_earnings', 'project_revenue', 'service_revenue', 'direct_labor_cost', 'operating_expense', 'tax_expense'
      parent_id TEXT,
      is_system_control INTEGER NOT NULL DEFAULT 0, -- Subledger-controlled accounts cannot have arbitrary manual lines
      is_active INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE(organization_id, code)
    );

    -- Journal Entries
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      entry_number TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      posting_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'posted', -- 'draft', 'posted', 'reversed', 'voided'
      source_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'opening_balance', 'invoice', 'payment', 'bill', 'bill_payment', 'payroll', 'partner_equity', 'pos_integration', 'reversal'
      source_id TEXT,
      reference TEXT,
      memo TEXT NOT NULL,
      total_debit TEXT NOT NULL,
      total_credit TEXT NOT NULL,
      created_by TEXT,
      posted_by TEXT,
      reversed_by_journal_id TEXT,
      idempotency_key TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE(organization_id, entry_number)
    );

    -- Journal Lines
    CREATE TABLE IF NOT EXISTS journal_lines (
      id TEXT PRIMARY KEY,
      journal_entry_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      account_code TEXT NOT NULL,
      account_name TEXT NOT NULL,
      description TEXT,
      debit TEXT NOT NULL DEFAULT '0.00',
      credit TEXT NOT NULL DEFAULT '0.00',
      project_id TEXT,
      client_id TEXT,
      vendor_id TEXT,
      FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
    );

    -- Clients
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      name TEXT NOT NULL,
      company_name TEXT,
      email TEXT,
      phone TEXT,
      tax_number TEXT,
      address TEXT,
      currency TEXT NOT NULL DEFAULT 'PKR',
      payment_terms_days INTEGER NOT NULL DEFAULT 30,
      balance TEXT NOT NULL DEFAULT '0.00',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- Vendors
    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      name TEXT NOT NULL,
      company_name TEXT,
      email TEXT,
      phone TEXT,
      tax_number TEXT,
      category TEXT NOT NULL DEFAULT 'General',
      payment_terms_days INTEGER NOT NULL DEFAULT 30,
      balance TEXT NOT NULL DEFAULT '0.00',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- Projects (Software House Project Finance)
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      client_id TEXT,
      billing_model TEXT NOT NULL DEFAULT 'fixed_price', -- 'fixed_price', 'hourly', 'milestone', 'retainer'
      contract_value TEXT NOT NULL DEFAULT '0.00',
      budget_cost_baseline TEXT NOT NULL DEFAULT '0.00',
      planned_labor_cost TEXT NOT NULL DEFAULT '0.00',
      start_date TEXT NOT NULL,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'on_hold'
      invoiced_amount TEXT NOT NULL DEFAULT '0.00',
      collected_amount TEXT NOT NULL DEFAULT '0.00',
      actual_cost TEXT NOT NULL DEFAULT '0.00',
      committed_cost TEXT NOT NULL DEFAULT '0.00',
      forecast_cost_to_complete TEXT NOT NULL DEFAULT '0.00',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
      UNIQUE(organization_id, code)
    );

    -- Invoices
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      project_id TEXT,
      invoice_number TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sent', -- 'draft', 'sent', 'partially_paid', 'paid', 'overdue', 'voided'
      subtotal TEXT NOT NULL DEFAULT '0.00',
      tax_rate TEXT NOT NULL DEFAULT '0.00',
      tax_amount TEXT NOT NULL DEFAULT '0.00',
      discount_amount TEXT NOT NULL DEFAULT '0.00',
      total_amount TEXT NOT NULL DEFAULT '0.00',
      paid_amount TEXT NOT NULL DEFAULT '0.00',
      balance_due TEXT NOT NULL DEFAULT '0.00',
      notes TEXT,
      journal_entry_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      UNIQUE(organization_id, invoice_number)
    );

    -- Invoice Items
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      description TEXT NOT NULL,
      quantity TEXT NOT NULL DEFAULT '1',
      unit_price TEXT NOT NULL DEFAULT '0.00',
      amount TEXT NOT NULL DEFAULT '0.00',
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    -- Bank Accounts
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      account_id TEXT NOT NULL, -- links to chart_of_accounts
      account_name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'PKR',
      current_balance TEXT NOT NULL DEFAULT '0.00',
      is_petty_cash INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
    );

    -- Payments (Client Receipts)
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      payment_number TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      amount TEXT NOT NULL,
      bank_account_id TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
      reference TEXT,
      notes TEXT,
      unallocated_amount TEXT NOT NULL DEFAULT '0.00',
      journal_entry_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
    );

    -- Payment Allocations to Invoices
    CREATE TABLE IF NOT EXISTS payment_allocations (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL,
      invoice_id TEXT NOT NULL,
      allocated_amount TEXT NOT NULL,
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    -- Vendor Bills
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      project_id TEXT,
      bill_number TEXT NOT NULL,
      bill_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_approval', -- 'draft', 'pending_approval', 'approved', 'partially_paid', 'paid', 'rejected'
      subtotal TEXT NOT NULL DEFAULT '0.00',
      tax_rate TEXT NOT NULL DEFAULT '0.00',
      tax_amount TEXT NOT NULL DEFAULT '0.00',
      total_amount TEXT NOT NULL DEFAULT '0.00',
      paid_amount TEXT NOT NULL DEFAULT '0.00',
      balance_due TEXT NOT NULL DEFAULT '0.00',
      expense_account_id TEXT NOT NULL,
      description TEXT,
      approved_by TEXT,
      approved_at TEXT,
      journal_entry_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (expense_account_id) REFERENCES chart_of_accounts(id),
      UNIQUE(organization_id, bill_number)
    );

    -- Bill Payments
    CREATE TABLE IF NOT EXISTS bill_payments (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      bill_id TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      payment_number TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      amount TEXT NOT NULL,
      bank_account_id TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
      reference TEXT,
      journal_entry_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (bill_id) REFERENCES bills(id),
      FOREIGN KEY (vendor_id) REFERENCES vendors(id),
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
    );

    -- Bank Transactions & Reconciliation
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      bank_account_id TEXT NOT NULL,
      transaction_date TEXT NOT NULL,
      description TEXT NOT NULL,
      reference TEXT,
      amount TEXT NOT NULL,
      type TEXT NOT NULL, -- 'deposit', 'withdrawal'
      is_reconciled INTEGER NOT NULL DEFAULT 0,
      matched_journal_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
    );

    -- Payroll Runs
    CREATE TABLE IF NOT EXISTS payroll_runs (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      period_month INTEGER NOT NULL,
      period_year INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'approved', 'paid'
      total_gross_pay TEXT NOT NULL DEFAULT '0.00',
      total_allowances TEXT NOT NULL DEFAULT '0.00',
      total_deductions TEXT NOT NULL DEFAULT '0.00',
      total_tax_withheld TEXT NOT NULL DEFAULT '0.00',
      total_net_pay TEXT NOT NULL DEFAULT '0.00',
      bank_account_id TEXT,
      journal_entry_id TEXT,
      disbursed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- Payroll Items
    CREATE TABLE IF NOT EXISTS payroll_items (
      id TEXT PRIMARY KEY,
      payroll_run_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      designation TEXT NOT NULL,
      base_salary TEXT NOT NULL,
      allowances TEXT NOT NULL DEFAULT '0.00',
      deductions TEXT NOT NULL DEFAULT '0.00',
      tax_withheld TEXT NOT NULL DEFAULT '0.00',
      net_salary TEXT NOT NULL,
      FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE
    );

    -- Partner Equity & Capital
    CREATE TABLE IF NOT EXISTS partner_equity_transactions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      partner_name TEXT NOT NULL,
      transaction_type TEXT NOT NULL, -- 'capital_contribution', 'drawing', 'loan_to_company', 'loan_from_company', 'profit_distribution'
      amount TEXT NOT NULL,
      date TEXT NOT NULL,
      bank_account_id TEXT NOT NULL,
      notes TEXT,
      journal_entry_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
    );

    -- Fixed Assets
    CREATE TABLE IF NOT EXISTS fixed_assets (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      asset_code TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      purchase_date TEXT NOT NULL,
      purchase_cost TEXT NOT NULL,
      useful_life_years INTEGER NOT NULL,
      salvage_value TEXT NOT NULL DEFAULT '0.00',
      depreciation_method TEXT NOT NULL DEFAULT 'straight_line',
      accumulated_depreciation TEXT NOT NULL DEFAULT '0.00',
      net_book_value TEXT NOT NULL,
      asset_account_id TEXT NOT NULL,
      depreciation_expense_account_id TEXT NOT NULL,
      accumulated_depreciation_account_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_service',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- Tax Configurations (Pakistan FBR / SRB / PRA & General)
    CREATE TABLE IF NOT EXISTS tax_configurations (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      name TEXT NOT NULL,
      jurisdiction TEXT NOT NULL, -- 'Pakistan Federal (FBR)', 'Sindh (SRB)', 'Punjab (PRA)', 'General'
      tax_type TEXT NOT NULL, -- 'sales_tax', 'services_tax', 'withholding_tax_contracts', 'withholding_tax_salary', 'withholding_tax_rent'
      rate_percent TEXT NOT NULL,
      is_inclusive INTEGER NOT NULL DEFAULT 0,
      output_tax_account_id TEXT,
      input_tax_account_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- Budgets & Forecasts
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      fiscal_year INTEGER NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      total_budget_revenue TEXT NOT NULL DEFAULT '0.00',
      total_budget_expense TEXT NOT NULL DEFAULT '0.00',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS budget_lines (
      id TEXT PRIMARY KEY,
      budget_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      project_id TEXT,
      budgeted_amount TEXT NOT NULL,
      FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
    );

    -- Client Finance Modules / Source Application Integration (Mode B)
    CREATE TABLE IF NOT EXISTS integration_events (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      source_app TEXT NOT NULL, -- 'nex-pos', 'nex-retail-erp', 'custom-billing', etc.
      event_type TEXT NOT NULL, -- 'pos_sale', 'pos_refund', 'purchase_receipt', 'external_invoice'
      idempotency_key TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processed', -- 'processed', 'failed', 'pending'
      processed_journal_id TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE(organization_id, idempotency_key)
    );

    -- Append-Only Audit Trail
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      user_id TEXT,
      user_email TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- Indexes for high-performance multi-tenant querying
    CREATE INDEX IF NOT EXISTS idx_journal_org_date ON journal_entries(organization_id, entry_date);
    CREATE INDEX IF NOT EXISTS idx_journal_lines_acc ON journal_lines(account_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(organization_id, client_id);
    CREATE INDEX IF NOT EXISTS idx_bills_vendor ON bills(organization_id, vendor_id);
    CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_events(organization_id, timestamp);
  `);

  seedInitialData();
}

function seedInitialData() {
  const orgCount = db.prepare('SELECT count(*) as count FROM organizations').get() as { count: number };
  if (orgCount.count > 0) {
    return; // Already seeded
  }

  const nexVeinsId = 'org-nexveins-01';
  const retailClientId = 'org-retailpos-02';

  // Seed default organizations
  db.prepare(`
    INSERT INTO organizations (id, name, slug, legal_name, tax_id, base_currency, country, fiscal_year_start_month)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nexVeinsId,
    'Nex Veins Technologies',
    'nex-veins',
    'Nex Veins Technologies (Pvt) Ltd',
    'PK-NTN-8947219-4',
    'PKR',
    'Pakistan',
    7
  );

  db.prepare(`
    INSERT INTO organizations (id, name, slug, legal_name, tax_id, base_currency, country, fiscal_year_start_month)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    retailClientId,
    'Apex Retail POS Client',
    'apex-retail',
    'Apex Retail Solutions Inc.',
    'PK-NTN-5481923-1',
    'PKR',
    'Pakistan',
    7
  );

  // Seed users
  const adminUser = {
    id: 'usr-admin-01',
    email: 'chaudaryrauf05@gmail.com',
    full_name: 'Chaudary Rauf (Chief Financial Architect)',
    avatar_url: '',
    global_role: 'admin'
  };

  const accountantUser = {
    id: 'usr-accountant-02',
    email: 'sarah.khan@nexveins.com',
    full_name: 'Sarah Khan (Senior Accountant)',
    avatar_url: '',
    global_role: 'user'
  };

  const auditorUser = {
    id: 'usr-auditor-03',
    email: 'auditor@kpmg-partner.com',
    full_name: 'Zubair Qureshi (Statutory Auditor)',
    avatar_url: '',
    global_role: 'user'
  };

  const insertUser = db.prepare('INSERT INTO users (id, email, full_name, avatar_url, global_role) VALUES (?, ?, ?, ?, ?)');
  insertUser.run(adminUser.id, adminUser.email, adminUser.full_name, adminUser.avatar_url, adminUser.global_role);
  insertUser.run(accountantUser.id, accountantUser.email, accountantUser.full_name, accountantUser.avatar_url, accountantUser.global_role);
  insertUser.run(auditorUser.id, auditorUser.email, auditorUser.full_name, auditorUser.avatar_url, auditorUser.global_role);

  // Assign memberships
  const insertMembership = db.prepare('INSERT INTO organization_memberships (id, organization_id, user_id, role) VALUES (?, ?, ?, ?)');
  insertMembership.run('mem-1', nexVeinsId, adminUser.id, 'admin');
  insertMembership.run('mem-2', nexVeinsId, accountantUser.id, 'accountant');
  insertMembership.run('mem-3', nexVeinsId, auditorUser.id, 'auditor');

  // Also assign admin to second client org to demonstrate switching & isolation
  insertMembership.run('mem-4', retailClientId, adminUser.id, 'admin');

  // Seed Fiscal Periods for Nex Veins
  const insertPeriod = db.prepare('INSERT INTO fiscal_periods (id, organization_id, name, start_date, end_date, is_locked) VALUES (?, ?, ?, ?, ?, ?)');
  insertPeriod.run('per-2026-q1', nexVeinsId, 'FY2026 - Q1 (Jul - Sep 2025)', '2025-07-01', '2025-09-30', 1);
  insertPeriod.run('per-2026-q2', nexVeinsId, 'FY2026 - Q2 (Oct - Dec 2025)', '2025-10-01', '2025-12-31', 1);
  insertPeriod.run('per-2026-q3', nexVeinsId, 'FY2026 - Q3 (Jan - Mar 2026)', '2026-01-01', '2026-03-31', 0);
  insertPeriod.run('per-2026-q4', nexVeinsId, 'FY2026 - Q4 (Apr - Jun 2026)', '2026-04-01', '2026-06-30', 0);

  // Seed Standard Chart of Accounts for Nex Veins
  const coaList = [
    // Assets (1000s)
    { code: '1010', name: 'Meezan Bank Operating A/C', type: 'asset', sub_type: 'cash_and_bank', is_system_control: 0, desc: 'Primary corporate operating checking account' },
    { code: '1020', name: 'Standard Chartered USD A/C', type: 'asset', sub_type: 'cash_and_bank', is_system_control: 0, desc: 'Foreign remittance & export proceeds account' },
    { code: '1050', name: 'Petty Cash - Lahore HQ', type: 'asset', sub_type: 'cash_and_bank', is_system_control: 0, desc: 'Office petty cash float' },
    { code: '1100', name: 'Accounts Receivable', type: 'asset', sub_type: 'accounts_receivable', is_system_control: 1, desc: 'Trade debtors subledger control account' },
    { code: '1200', name: 'Prepaid Subscriptions & Hosting', type: 'asset', sub_type: 'current_asset', is_system_control: 0, desc: 'AWS, GitHub, Google Cloud prepaid licenses' },
    { code: '1500', name: 'Computer Equipment & Servers', type: 'asset', sub_type: 'fixed_asset', is_system_control: 0, desc: 'MacBooks, developer workstations, local servers' },
    { code: '1510', name: 'Accumulated Depreciation - Equipment', type: 'asset', sub_type: 'fixed_asset', is_system_control: 0, desc: 'Contra asset account for depreciation' },
    { code: '1600', name: 'Office Furniture & Fixtures', type: 'asset', sub_type: 'fixed_asset', is_system_control: 0, desc: 'Workstations, acoustic pods, boardroom fittings' },

    // Liabilities (2000s)
    { code: '2100', name: 'Accounts Payable', type: 'liability', sub_type: 'accounts_payable', is_system_control: 1, desc: 'Trade creditors & vendor subledger control' },
    { code: '2200', name: 'Accrued Payroll & Salaries Payable', type: 'liability', sub_type: 'current_liability', is_system_control: 0, desc: 'Salaries earned but pending disbursement' },
    { code: '2300', name: 'FBR Withholding Tax Payable', type: 'liability', sub_type: 'current_liability', is_system_control: 0, desc: 'Income tax withheld from contractors & employees' },
    { code: '2310', name: 'PRA/SRB Provincial Sales Tax Payable', type: 'liability', sub_type: 'current_liability', is_system_control: 0, desc: 'Output sales tax on IT services' },
    { code: '2500', name: 'Partner Loan Payable', type: 'liability', sub_type: 'current_liability', is_system_control: 0, desc: 'Short-term liquidity injected by partners' },

    // Equity (3000s)
    { code: '3010', name: 'Partner Capital - Chaudary Rauf', type: 'equity', sub_type: 'partner_capital', is_system_control: 0, desc: 'Initial and contributed capital' },
    { code: '3020', name: 'Partner Capital - Co-Founder', type: 'equity', sub_type: 'partner_capital', is_system_control: 0, desc: 'Co-founder contributed equity' },
    { code: '3100', name: 'Partner Drawings', type: 'equity', sub_type: 'partner_capital', is_system_control: 0, desc: 'Partner profit withdrawals' },
    { code: '3200', name: 'Retained Earnings', type: 'equity', sub_type: 'retained_earnings', is_system_control: 0, desc: 'Accumulated profits retained in business' },
    { code: '3300', name: 'Opening Balance Equity', type: 'equity', sub_type: 'retained_earnings', is_system_control: 0, desc: 'System balancing account for historical migration' },

    // Revenue (4000s)
    { code: '4010', name: 'Custom Software Development Revenue', type: 'revenue', sub_type: 'project_revenue', is_system_control: 0, desc: 'Enterprise full-stack and web app contracts' },
    { code: '4020', name: 'AI & Cloud Engineering Services', type: 'revenue', sub_type: 'project_revenue', is_system_control: 0, desc: 'Model fine-tuning, ML pipelines, and DevOps' },
    { code: '4030', name: 'Dedicated Engineering Retainers', type: 'revenue', sub_type: 'service_revenue', is_system_control: 0, desc: 'Monthly ongoing team retainer contracts' },
    { code: '4040', name: 'POS & ERP Client Licensing Modules', type: 'revenue', sub_type: 'service_revenue', is_system_control: 0, desc: 'Platform module usage fees from clients' },

    // Expenses (5000s & 6000s)
    { code: '5010', name: 'Direct Software Engineering Salaries', type: 'expense', sub_type: 'direct_labor_cost', is_system_control: 0, desc: 'COGS - Direct developer and tech lead compensation' },
    { code: '5020', name: 'Subcontractor & Freelance Developer Fees', type: 'expense', sub_type: 'direct_labor_cost', is_system_control: 0, desc: 'COGS - Specialist external engineering hours' },
    { code: '5030', name: 'Client Cloud Hosting & API Infrastructure', type: 'expense', sub_type: 'operating_expense', is_system_control: 0, desc: 'COGS - AWS, GCP, Vercel costs allocated to client apps' },
    { code: '6010', name: 'Office Rent & Facilities', type: 'expense', sub_type: 'operating_expense', is_system_control: 0, desc: 'Lahore HQ office lease and utilities' },
    { code: '6020', name: 'Internal Software Subscriptions & Tools', type: 'expense', sub_type: 'operating_expense', is_system_control: 0, desc: 'Slack, JetBrains, Linear, Figma, GitHub Enterprise' },
    { code: '6030', name: 'Internet, Networking & Utilities', type: 'expense', sub_type: 'operating_expense', is_system_control: 0, desc: 'Redundant fiber lines and generator fuel' },
    { code: '6040', name: 'Marketing, Events & Business Development', type: 'expense', sub_type: 'operating_expense', is_system_control: 0, desc: 'Conference sponsorships and client acquisition' },
    { code: '6050', name: 'Depreciation Expense', type: 'expense', sub_type: 'operating_expense', is_system_control: 0, desc: 'Monthly straight-line depreciation allocation' },
    { code: '6060', name: 'Bank Charges & Remittance Fees', type: 'expense', sub_type: 'operating_expense', is_system_control: 0, desc: 'SWIFT wire fees and transaction costs' }
  ];

  const insertCoa = db.prepare(`
    INSERT INTO chart_of_accounts (id, organization_id, code, name, type, sub_type, is_system_control, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of coaList) {
    const accId = `acc-${nexVeinsId}-${item.code}`;
    insertCoa.run(accId, nexVeinsId, item.code, item.name, item.type, item.sub_type, item.is_system_control, item.desc);
  }

  // Also seed a basic COA for the retail client org to show independence
  for (const item of coaList.slice(0, 10)) {
    const accId = `acc-${retailClientId}-${item.code}`;
    insertCoa.run(accId, retailClientId, item.code, item.name, item.type, item.sub_type, item.is_system_control, item.desc);
  }

  // Seed Bank Accounts
  const meezanAccId = `acc-${nexVeinsId}-1010`;
  const scbAccId = `acc-${nexVeinsId}-1020`;
  const pettyAccId = `acc-${nexVeinsId}-1050`;

  const insertBank = db.prepare(`
    INSERT INTO bank_accounts (id, organization_id, account_id, account_name, bank_name, account_number, currency, current_balance, is_petty_cash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBank.run('bnk-1', nexVeinsId, meezanAccId, 'Meezan Corporate PKR Account', 'Meezan Bank Ltd', 'PK89MEZN00012345678901', 'PKR', '8500000.00', 0);
  insertBank.run('bnk-2', nexVeinsId, scbAccId, 'SCB Remittance USD Account', 'Standard Chartered Bank', 'PK12SCBL00098765432100', 'USD', '25000.00', 0);
  insertBank.run('bnk-3', nexVeinsId, pettyAccId, 'Lahore HQ Petty Cash', 'Cash Drawer', 'PC-LHR-01', 'PKR', '150000.00', 1);

  // Seed Tax Configurations (Pakistan rules)
  const insertTax = db.prepare(`
    INSERT INTO tax_configurations (id, organization_id, name, jurisdiction, tax_type, rate_percent, is_inclusive, output_tax_account_id, input_tax_account_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const taxPayableAccId = `acc-${nexVeinsId}-2300`;
  insertTax.run('tax-1', nexVeinsId, 'FBR Withholding Tax on IT Contracts (Filer)', 'Pakistan Federal (FBR)', 'withholding_tax_contracts', '3.00', 0, taxPayableAccId, null);
  insertTax.run('tax-2', nexVeinsId, 'PRA Sales Tax on IT Services (Punjab)', 'Punjab (PRA)', 'services_tax', '5.00', 0, `acc-${nexVeinsId}-2310`, null);
  insertTax.run('tax-3', nexVeinsId, 'Standard Services Tax (Sindh SRB)', 'Sindh (SRB)', 'services_tax', '13.00', 0, `acc-${nexVeinsId}-2310`, null);

  // Seed Clients
  const insertClient = db.prepare(`
    INSERT INTO clients (id, organization_id, name, company_name, email, phone, tax_number, address, currency, payment_terms_days, balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertClient.run('cli-1', nexVeinsId, 'Tariq Mehmood', 'Apex Retail Group', 'tariq@apexretail.pk', '+92 300 8472911', 'PK-NTN-419284-9', 'DHA Phase 5, Lahore, Pakistan', 'PKR', 30, '0.00');
  insertClient.run('cli-2', nexVeinsId, 'Julian Vance', 'FinScale Global UK', 'julian@finscale.io', '+44 20 7946 0912', 'GB-VAT-99210482', '25 Bank Street, Canary Wharf, London', 'USD', 15, '0.00');
  insertClient.run('cli-3', nexVeinsId, 'Dr. Arman Siddiqui', 'MediHealth Diagnostic Systems', 'arman@medihealth.com.pk', '+92 321 4455667', 'PK-NTN-338192-2', 'Gulberg III, Lahore, Pakistan', 'PKR', 30, '0.00');

  // Seed Vendors
  const insertVendor = db.prepare(`
    INSERT INTO vendors (id, organization_id, name, company_name, email, phone, tax_number, category, payment_terms_days, balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertVendor.run('ven-1', nexVeinsId, 'Amazon Web Services EMEA', 'Amazon Web Services Inc.', 'billing@aws.amazon.com', '+1 800 297 0000', 'US-EIN-91-1234567', 'Cloud Infrastructure', 30, '0.00');
  insertVendor.run('ven-2', nexVeinsId, 'Malik Real Estate & Tower', 'Pace Tower Management', 'accounts@pacetower.pk', '+92 42 35789000', 'PK-NTN-102938-4', 'Office Facilities', 15, '0.00');
  insertVendor.run('ven-3', nexVeinsId, 'Nayatel Enterprise Fiber', 'Nayatel Telecom (Pvt) Ltd', 'enterprise@nayatel.com', '+92 51 111 114 444', 'PK-NTN-773821-6', 'Utilities & Internet', 15, '0.00');

  // Seed Projects for Nex Veins
  const insertProj = db.prepare(`
    INSERT INTO projects (id, organization_id, code, name, client_id, billing_model, contract_value, budget_cost_baseline, planned_labor_cost, start_date, end_date, status, invoiced_amount, collected_amount, actual_cost, committed_cost, forecast_cost_to_complete)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProj.run(
    'prj-1',
    nexVeinsId,
    'NV-PRJ-2026-01',
    'Apex Enterprise Cloud POS & Finance Module',
    'cli-1',
    'milestone',
    '4500000.00',
    '2400000.00',
    '1800000.00',
    '2026-01-15',
    '2026-06-30',
    'active',
    '1500000.00',
    '1500000.00',
    '950000.00',
    '400000.00',
    '1050000.00'
  );

  insertProj.run(
    'prj-2',
    nexVeinsId,
    'NV-PRJ-2026-02',
    'FinScale Cross-Border Remittance Gateway',
    'cli-2',
    'fixed_price',
    '8200000.00',
    '4800000.00',
    '3600000.00',
    '2026-02-01',
    '2026-08-31',
    'active',
    '3000000.00',
    '2000000.00',
    '1800000.00',
    '800000.00',
    '2200000.00'
  );

  // Seed Opening Balance Journal Entry to verify Double-Entry consistency right from day 1
  const jrnId = 'jrn-opening-01';
  db.prepare(`
    INSERT INTO journal_entries (id, organization_id, entry_number, entry_date, posting_date, status, source_type, reference, memo, total_debit, total_credit, created_by, posted_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    jrnId,
    nexVeinsId,
    'JRN-2025-001',
    '2025-07-01',
    '2025-07-01',
    'posted',
    'opening_balance',
    'FY2026-START',
    'Approved Initial Opening Balances for Nex Veins Technologies',
    '10650000.00',
    '10650000.00',
    adminUser.id,
    adminUser.id
  );

  const insertLine = db.prepare(`
    INSERT INTO journal_lines (id, journal_entry_id, account_id, account_code, account_name, description, debit, credit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Debits: Bank PKR (8,500,000), Equipment (2,000,000), Petty Cash (150,000) = 10,650,000
  // Credits: Partner Capital Chaudary Rauf (6,000,000), Partner Capital Co-founder (4,000,000), Retained Earnings (650,000) = 10,650,000
  insertLine.run('jln-1', jrnId, `acc-${nexVeinsId}-1010`, '1010', 'Meezan Bank Operating A/C', 'Opening Bank Balance', '8500000.00', '0.00');
  insertLine.run('jln-2', jrnId, `acc-${nexVeinsId}-1500`, '1500', 'Computer Equipment & Servers', 'Capitalized Workstations', '2000000.00', '0.00');
  insertLine.run('jln-3', jrnId, `acc-${nexVeinsId}-1050`, '1050', 'Petty Cash - Lahore HQ', 'Opening Petty Cash', '150000.00', '0.00');

  insertLine.run('jln-4', jrnId, `acc-${nexVeinsId}-3010`, '3010', 'Partner Capital - Chaudary Rauf', 'Founder Capital Contribution', '0.00', '6000000.00');
  insertLine.run('jln-5', jrnId, `acc-${nexVeinsId}-3020`, '3020', 'Partner Capital - Co-Founder', 'Co-Founder Capital Contribution', '0.00', '4000000.00');
  insertLine.run('jln-6', jrnId, `acc-${nexVeinsId}-3200`, '3200', 'Retained Earnings', 'Historical Retained Surplus', '0.00', '650000.00');

  // Seed Fixed Assets
  db.prepare(`
    INSERT INTO fixed_assets (id, organization_id, asset_code, name, category, purchase_date, purchase_cost, useful_life_years, salvage_value, depreciation_method, accumulated_depreciation, net_book_value, asset_account_id, depreciation_expense_account_id, accumulated_depreciation_account_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ast-1',
    nexVeinsId,
    'AST-001',
    'MacBook Pro M3 Max Engineering Fleet (5x)',
    'Computer Hardware',
    '2025-07-01',
    '2000000.00',
    3,
    '200000.00',
    'straight_line',
    '300000.00',
    '1700000.00',
    `acc-${nexVeinsId}-1500`,
    `acc-${nexVeinsId}-6050`,
    `acc-${nexVeinsId}-1510`,
    'in_service'
  );

  // Seed Initial Audit log
  db.prepare(`
    INSERT INTO audit_events (id, organization_id, user_id, user_email, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'aud-01',
    nexVeinsId,
    adminUser.id,
    adminUser.email,
    'SYSTEM_BOOTSTRAP',
    'ORGANIZATION',
    nexVeinsId,
    'Initial organization configuration, chart of accounts bootstrap, and opening balances recorded.'
  );
}
