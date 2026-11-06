import { Router, Request, Response } from 'express';
import { db } from './db.js';
import { AccountingEngine } from './accountingEngine.js';
import { Decimal } from 'decimal.js';

export const apiRouter = Router();

// Middleware to resolve active organization and user context
interface AuthContext {
  userId: string;
  userEmail: string;
  userName: string;
  orgId: string;
  role: string;
}

let currentSession = {
  userId: 'usr-admin-01',
  orgId: 'org-nexveins-01',
  role: 'admin'
};

function getAuthContext(req: Request): AuthContext {
  const headerOrg = req.headers['x-organization-id'] as string;
  const headerUser = req.headers['x-user-id'] as string;
  const headerRole = req.headers['x-user-role'] as string;

  const orgId = headerOrg || currentSession.orgId;
  const userId = headerUser || currentSession.userId;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  const membership = db.prepare(`
    SELECT * FROM organization_memberships 
    WHERE organization_id = ? AND user_id = ?
  `).get(orgId, userId) as any;

  return {
    userId,
    userEmail: user?.email || 'admin@nexveins.com',
    userName: user?.full_name || 'Administrator',
    orgId,
    role: headerRole || membership?.role || 'admin'
  };
}

// ---------------- AUTH & SESSION ----------------
apiRouter.get('/auth/me', (req, res) => {
  const auth = getAuthContext(req);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(auth.userId);
  const organizations = db.prepare(`
    SELECT o.*, m.role as user_role 
    FROM organizations o
    JOIN organization_memberships m ON o.id = m.organization_id
    WHERE m.user_id = ?
  `).all(auth.userId);

  const activeOrg = db.prepare('SELECT * FROM organizations WHERE id = ?').get(auth.orgId);

  res.json({
    user,
    active_organization: activeOrg,
    role: auth.role,
    organizations
  });
});

apiRouter.post('/auth/switch-context', (req, res) => {
  const { orgId, userId, role } = req.body;
  if (orgId) currentSession.orgId = orgId;
  if (userId) currentSession.userId = userId;
  if (role) currentSession.role = role;

  res.json({ success: true, session: currentSession });
});

// ---------------- ORGANIZATIONS ----------------
apiRouter.get('/organizations', (req, res) => {
  const orgs = db.prepare('SELECT * FROM organizations ORDER BY created_at ASC').all();
  res.json(orgs);
});

apiRouter.post('/organizations', (req, res) => {
  const auth = getAuthContext(req);
  const { name, legal_name, base_currency, country, tax_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Organization name is required.' });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const orgId = `org-${Date.now()}`;

  const defaultModules = JSON.stringify([
    'sales', 'purchases', 'banking', 'projects', 'payroll', 'equity', 'assets', 'taxation', 'budgets', 'integrations'
  ]);

  db.transaction(() => {
    db.prepare(`
      INSERT INTO organizations (id, name, slug, legal_name, tax_id, base_currency, country, enabled_modules)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(orgId, name, slug, legal_name || name, tax_id || '', base_currency || 'PKR', country || 'Pakistan', defaultModules);

    // Add membership for creator as admin
    db.prepare(`
      INSERT INTO organization_memberships (id, organization_id, user_id, role)
      VALUES (?, ?, ?, ?)
    `).run(`mem-${Date.now()}`, orgId, auth.userId, 'admin');

    // Create standard basic Chart of Accounts for the new organization
    const coaSeed = [
      { code: '1010', name: 'Operating Bank Account', type: 'asset', sub_type: 'cash_and_bank', is_system_control: 0 },
      { code: '1100', name: 'Accounts Receivable', type: 'asset', sub_type: 'accounts_receivable', is_system_control: 1 },
      { code: '2100', name: 'Accounts Payable', type: 'liability', sub_type: 'accounts_payable', is_system_control: 1 },
      { code: '3010', name: 'Founder Capital', type: 'equity', sub_type: 'partner_capital', is_system_control: 0 },
      { code: '3200', name: 'Retained Earnings', type: 'equity', sub_type: 'retained_earnings', is_system_control: 0 },
      { code: '4010', name: 'Sales & Services Revenue', type: 'revenue', sub_type: 'project_revenue', is_system_control: 0 },
      { code: '5010', name: 'Direct Project Costs', type: 'expense', sub_type: 'direct_labor_cost', is_system_control: 0 },
      { code: '6010', name: 'General & Administrative Expenses', type: 'expense', sub_type: 'operating_expense', is_system_control: 0 }
    ];

    const insertCoa = db.prepare(`
      INSERT INTO chart_of_accounts (id, organization_id, code, name, type, sub_type, is_system_control, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of coaSeed) {
      insertCoa.run(`acc-${orgId}-${item.code}`, orgId, item.code, item.name, item.type, item.sub_type, item.is_system_control, `${item.name} for ${name}`);
    }

    // Add bank account
    db.prepare(`
      INSERT INTO bank_accounts (id, organization_id, account_id, account_name, bank_name, account_number, currency, current_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`bnk-${orgId}-1`, orgId, `acc-${orgId}-1010`, 'Main Operating Bank', 'Standard Bank', '00000000', base_currency || 'PKR', '0.00');

    // Add default open fiscal period
    db.prepare(`
      INSERT INTO fiscal_periods (id, organization_id, name, start_date, end_date, is_locked)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`per-${orgId}-2026`, orgId, 'FY2026 Current Period', '2025-07-01', '2026-06-30', 0);

    AccountingEngine.logAudit({
      organization_id: orgId,
      user_id: auth.userId,
      user_email: auth.userEmail,
      action: 'CREATE_ORGANIZATION',
      entity_type: 'ORGANIZATION',
      entity_id: orgId,
      details: `Created new organization ${name} (${orgId}) with isolated Chart of Accounts.`
    });
  })();

  res.status(201).json({ id: orgId, name, slug });
});

// ---------------- CHART OF ACCOUNTS ----------------
apiRouter.get('/accounts', (req, res) => {
  const auth = getAuthContext(req);
  const accounts = db.prepare(`
    SELECT a.*,
      COALESCE((
        SELECT SUM(CAST(l.debit AS NUMERIC)) - SUM(CAST(l.credit AS NUMERIC))
        FROM journal_lines l
        JOIN journal_entries j ON l.journal_entry_id = j.id
        WHERE l.account_id = a.id AND j.status = 'posted'
      ), 0) as balance_raw
    FROM chart_of_accounts a
    WHERE a.organization_id = ?
    ORDER BY a.code ASC
  `).all(auth.orgId);

  res.json(accounts);
});

apiRouter.post('/accounts', (req, res) => {
  const auth = getAuthContext(req);
  const { code, name, type, sub_type, is_system_control, description } = req.body;

  if (!code || !name || !type || !sub_type) {
    return res.status(400).json({ error: 'Code, name, type, and sub_type are required.' });
  }

  const id = `acc-${auth.orgId}-${code}`;
  try {
    db.prepare(`
      INSERT INTO chart_of_accounts (id, organization_id, code, name, type, sub_type, is_system_control, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, auth.orgId, code, name, type, sub_type, is_system_control ? 1 : 0, description || null);

    AccountingEngine.logAudit({
      organization_id: auth.orgId,
      user_id: auth.userId,
      user_email: auth.userEmail,
      action: 'CREATE_ACCOUNT',
      entity_type: 'CHART_OF_ACCOUNTS',
      entity_id: id,
      details: `Created account ${code} - ${name} (${type}/${sub_type}).`
    });

    res.status(201).json({ id, code, name, type, sub_type });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------- JOURNAL ENTRIES ----------------
apiRouter.get('/journals', (req, res) => {
  const auth = getAuthContext(req);
  const journals = db.prepare(`
    SELECT * FROM journal_entries
    WHERE organization_id = ?
    ORDER BY posting_date DESC, entry_number DESC
  `).all(auth.orgId) as any[];

  for (const j of journals) {
    j.lines = db.prepare('SELECT * FROM journal_lines WHERE journal_entry_id = ?').all(j.id);
  }

  res.json(journals);
});

apiRouter.post('/journals', (req, res) => {
  const auth = getAuthContext(req);
  const { entry_date, posting_date, memo, lines, reference } = req.body;

  if (!lines || !Array.isArray(lines) || lines.length < 2) {
    return res.status(400).json({ error: 'Journal must contain at least 2 balanced line items.' });
  }

  try {
    const journalId = AccountingEngine.postJournalEntry({
      organization_id: auth.orgId,
      entry_date: entry_date || new Date().toISOString().split('T')[0],
      posting_date: posting_date || new Date().toISOString().split('T')[0],
      source_type: 'manual',
      reference: reference || null,
      memo: memo || 'Manual Journal Entry',
      lines,
      created_by: auth.userId,
      posted_by: auth.userId
    });

    res.status(201).json({ id: journalId, message: 'Journal entry successfully posted and reconciled.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/journals/:id/reverse', (req, res) => {
  const auth = getAuthContext(req);
  const { reason, reversal_date } = req.body;

  try {
    const reversalId = AccountingEngine.reverseJournalEntry({
      organization_id: auth.orgId,
      journal_id: req.params.id,
      reversal_date: reversal_date || new Date().toISOString().split('T')[0],
      reason: reason || 'Correction of entry',
      user_id: auth.userId
    });

    res.json({ id: reversalId, message: 'Journal entry reversed successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------- CLIENTS & INVOICES (SALES / AR) ----------------
apiRouter.get('/clients', (req, res) => {
  const auth = getAuthContext(req);
  const clients = db.prepare('SELECT * FROM clients WHERE organization_id = ? ORDER BY name ASC').all(auth.orgId);
  res.json(clients);
});

apiRouter.post('/clients', (req, res) => {
  const auth = getAuthContext(req);
  const { name, company_name, email, phone, tax_number, address, currency, payment_terms_days } = req.body;

  if (!name) return res.status(400).json({ error: 'Client name is required.' });

  const id = `cli-${Date.now()}`;
  db.prepare(`
    INSERT INTO clients (id, organization_id, name, company_name, email, phone, tax_number, address, currency, payment_terms_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, auth.orgId, name, company_name || null, email || null, phone || null, tax_number || null, address || null, currency || 'PKR', payment_terms_days || 30);

  res.status(201).json({ id, name });
});

apiRouter.get('/invoices', (req, res) => {
  const auth = getAuthContext(req);
  const invoices = db.prepare(`
    SELECT i.*, c.name as client_name, c.company_name, p.name as project_name, p.code as project_code
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    LEFT JOIN projects p ON i.project_id = p.id
    WHERE i.organization_id = ?
    ORDER BY i.issue_date DESC, i.invoice_number DESC
  `).all(auth.orgId) as any[];

  for (const inv of invoices) {
    inv.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
  }

  res.json(invoices);
});

apiRouter.post('/invoices', (req, res) => {
  const auth = getAuthContext(req);
  const { client_id, project_id, issue_date, due_date, items, notes, tax_rate_percent } = req.body;

  if (!client_id || !items || items.length === 0) {
    return res.status(400).json({ error: 'Client and at least one item are required.' });
  }

  const client = db.prepare('SELECT * FROM clients WHERE id = ? AND organization_id = ?').get(client_id, auth.orgId) as any;
  if (!client) return res.status(404).json({ error: 'Client not found.' });

  // Calculate totals
  let subtotal = new Decimal(0);
  for (const item of items) {
    const qty = new Decimal(item.quantity || 1);
    const price = new Decimal(item.unit_price || 0);
    subtotal = subtotal.plus(qty.times(price));
  }

  const taxPercent = new Decimal(tax_rate_percent || 0);
  const taxAmount = subtotal.times(taxPercent.dividedBy(100));
  const totalAmount = subtotal.plus(taxAmount);

  const year = new Date(issue_date || new Date()).getFullYear();
  const invoiceCount = db.prepare(`
    SELECT count(*) as count FROM invoices WHERE organization_id = ? AND strftime('%Y', issue_date) = ?
  `).get(auth.orgId, year.toString()) as { count: number };

  const invoiceNumber = `INV-${year}-${(invoiceCount.count + 1).toString().padStart(4, '0')}`;
  const invoiceId = `inv-${Date.now()}`;

  // Find relevant accounts for automatic posting
  const arAccount = db.prepare(`SELECT * FROM chart_of_accounts WHERE organization_id = ? AND sub_type = 'accounts_receivable'`).get(auth.orgId) as any;
  const revAccount = db.prepare(`SELECT * FROM chart_of_accounts WHERE organization_id = ? AND type = 'revenue' ORDER BY code ASC LIMIT 1`).get(auth.orgId) as any;
  const taxAccount = db.prepare(`SELECT * FROM chart_of_accounts WHERE organization_id = ? AND sub_type = 'current_liability' AND code LIKE '%23%' LIMIT 1`).get(auth.orgId) as any;

  if (!arAccount || !revAccount) {
    return res.status(400).json({ error: 'Required Accounts Receivable or Revenue account missing in Chart of Accounts.' });
  }

  const invoiceDate = issue_date || new Date().toISOString().split('T')[0];
  const dueDate = due_date || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];

  db.transaction(() => {
    // 1. Double-Entry Posting:
    // Debit: Accounts Receivable (totalAmount)
    // Credit: Revenue (subtotal)
    // Credit: Tax Payable (taxAmount) if > 0
    const journalLines = [
      {
        account_id: arAccount.id,
        account_code: arAccount.code,
        account_name: arAccount.name,
        description: `Invoice ${invoiceNumber} issued to ${client.name}`,
        debit: totalAmount.toFixed(2),
        credit: '0.00',
        project_id: project_id || null,
        client_id: client_id
      },
      {
        account_id: revAccount.id,
        account_code: revAccount.code,
        account_name: revAccount.name,
        description: `Revenue from Invoice ${invoiceNumber}`,
        debit: '0.00',
        credit: subtotal.toFixed(2),
        project_id: project_id || null,
        client_id: client_id
      }
    ];

    if (taxAmount.greaterThan(0) && taxAccount) {
      journalLines.push({
        account_id: taxAccount.id,
        account_code: taxAccount.code,
        account_name: taxAccount.name,
        description: `Output Tax for Invoice ${invoiceNumber}`,
        debit: '0.00',
        credit: taxAmount.toFixed(2),
        project_id: project_id || null,
        client_id: client_id
      });
    }

    const journalId = AccountingEngine.postJournalEntry({
      organization_id: auth.orgId,
      entry_date: invoiceDate,
      posting_date: invoiceDate,
      source_type: 'invoice',
      source_id: invoiceId,
      reference: invoiceNumber,
      memo: `Invoice ${invoiceNumber} issued to ${client.company_name || client.name}`,
      lines: journalLines,
      created_by: auth.userId,
      posted_by: auth.userId
    });

    // 2. Insert Invoice
    db.prepare(`
      INSERT INTO invoices (
        id, organization_id, client_id, project_id, invoice_number, issue_date, due_date,
        status, subtotal, tax_rate, tax_amount, total_amount, paid_amount, balance_due, notes, journal_entry_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceId,
      auth.orgId,
      client_id,
      project_id || null,
      invoiceNumber,
      invoiceDate,
      dueDate,
      'sent',
      subtotal.toFixed(2),
      taxPercent.toFixed(2),
      taxAmount.toFixed(2),
      totalAmount.toFixed(2),
      '0.00',
      totalAmount.toFixed(2),
      notes || null,
      journalId
    );

    // 3. Insert Items
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const q = new Decimal(it.quantity || 1);
      const u = new Decimal(it.unit_price || 0);
      insertItem.run(`item-${invoiceId}-${i + 1}`, invoiceId, it.description, q.toString(), u.toFixed(2), q.times(u).toFixed(2));
    }

    // 4. Update Client Balance
    const newClientBalance = new Decimal(client.balance || 0).plus(totalAmount);
    db.prepare('UPDATE clients SET balance = ? WHERE id = ?').run(newClientBalance.toFixed(2), client_id);

    // 5. Update Project Invoiced Amount if linked
    if (project_id) {
      const proj = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id) as any;
      if (proj) {
        const newInvoiced = new Decimal(proj.invoiced_amount || 0).plus(totalAmount);
        db.prepare('UPDATE projects SET invoiced_amount = ? WHERE id = ?').run(newInvoiced.toFixed(2), project_id);
      }
    }
  })();

  res.status(201).json({ id: invoiceId, invoice_number: invoiceNumber, total_amount: totalAmount.toFixed(2) });
});

// ---------------- CLIENT PAYMENTS (RECEIPTS) ----------------
apiRouter.post('/payments', (req, res) => {
  const auth = getAuthContext(req);
  const { client_id, invoice_id, amount, bank_account_id, payment_date, payment_method, reference, notes } = req.body;

  if (!client_id || !amount || !bank_account_id) {
    return res.status(400).json({ error: 'Client, payment amount, and bank account are required.' });
  }

  const payAmount = new Decimal(amount);
  if (payAmount.lessThanOrEqualTo(0)) {
    return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
  }

  const client = db.prepare('SELECT * FROM clients WHERE id = ? AND organization_id = ?').get(client_id, auth.orgId) as any;
  const bank = db.prepare('SELECT * FROM bank_accounts WHERE id = ? AND organization_id = ?').get(bank_account_id, auth.orgId) as any;

  if (!client || !bank) return res.status(404).json({ error: 'Client or Bank Account not found.' });

  const arAccount = db.prepare(`SELECT * FROM chart_of_accounts WHERE organization_id = ? AND sub_type = 'accounts_receivable'`).get(auth.orgId) as any;
  const bankLedgerAccount = db.prepare(`SELECT * FROM chart_of_accounts WHERE id = ?`).get(bank.account_id) as any;

  const paymentDate = payment_date || new Date().toISOString().split('T')[0];
  const year = new Date(paymentDate).getFullYear();
  const count = db.prepare(`SELECT count(*) as count FROM payments WHERE organization_id = ?`).get(auth.orgId) as { count: number };
  const paymentNumber = `RCP-${year}-${(count.count + 1).toString().padStart(4, '0')}`;
  const paymentId = `pmt-${Date.now()}`;

  db.transaction(() => {
    // 1. Double-Entry Posting:
    // Debit: Bank Account (payAmount)
    // Credit: Accounts Receivable (payAmount)
    const journalLines = [
      {
        account_id: bankLedgerAccount.id,
        account_code: bankLedgerAccount.code,
        account_name: bankLedgerAccount.name,
        description: `Receipt ${paymentNumber} from ${client.company_name || client.name}`,
        debit: payAmount.toFixed(2),
        credit: '0.00',
        client_id: client_id
      },
      {
        account_id: arAccount.id,
        account_code: arAccount.code,
        account_name: arAccount.name,
        description: `Settlement of receivables via ${paymentNumber}`,
        debit: '0.00',
        credit: payAmount.toFixed(2),
        client_id: client_id
      }
    ];

    const journalId = AccountingEngine.postJournalEntry({
      organization_id: auth.orgId,
      entry_date: paymentDate,
      posting_date: paymentDate,
      source_type: 'payment',
      source_id: paymentId,
      reference: reference || paymentNumber,
      memo: `Client Payment ${paymentNumber} from ${client.company_name || client.name}`,
      lines: journalLines,
      created_by: auth.userId,
      posted_by: auth.userId
    });

    // 2. Insert Payment Record
    db.prepare(`
      INSERT INTO payments (
        id, organization_id, client_id, payment_number, payment_date, amount,
        bank_account_id, payment_method, reference, notes, unallocated_amount, journal_entry_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      paymentId,
      auth.orgId,
      client_id,
      paymentNumber,
      paymentDate,
      payAmount.toFixed(2),
      bank_account_id,
      payment_method || 'bank_transfer',
      reference || null,
      notes || null,
      '0.00',
      journalId
    );

    // 3. Allocate to invoice if specified
    if (invoice_id) {
      const inv = db.prepare('SELECT * FROM invoices WHERE id = ? AND organization_id = ?').get(invoice_id, auth.orgId) as any;
      if (inv) {
        const currentPaid = new Decimal(inv.paid_amount || 0);
        const currentBalance = new Decimal(inv.balance_due || 0);
        const allocation = Decimal.min(payAmount, currentBalance);

        const newPaid = currentPaid.plus(allocation);
        const newBal = currentBalance.minus(allocation);
        const newStatus = newBal.isZero() ? 'paid' : 'partially_paid';

        db.prepare(`
          UPDATE invoices SET paid_amount = ?, balance_due = ?, status = ? WHERE id = ?
        `).run(newPaid.toFixed(2), newBal.toFixed(2), newStatus, invoice_id);

        db.prepare(`
          INSERT INTO payment_allocations (id, payment_id, invoice_id, allocated_amount)
          VALUES (?, ?, ?, ?)
        `).run(`alc-${Date.now()}`, paymentId, invoice_id, allocation.toFixed(2));

        // Update Project collected amount if linked
        if (inv.project_id) {
          const proj = db.prepare('SELECT * FROM projects WHERE id = ?').get(inv.project_id) as any;
          if (proj) {
            const newCollected = new Decimal(proj.collected_amount || 0).plus(allocation);
            db.prepare('UPDATE projects SET collected_amount = ? WHERE id = ?').run(newCollected.toFixed(2), inv.project_id);
          }
        }
      }
    }

    // 4. Update Bank Balance
    const newBankBal = new Decimal(bank.current_balance || 0).plus(payAmount);
    db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?').run(newBankBal.toFixed(2), bank_account_id);

    // 5. Update Client Balance
    const newClientBal = new Decimal(client.balance || 0).minus(payAmount);
    db.prepare('UPDATE clients SET balance = ? WHERE id = ?').run(newClientBal.toFixed(2), client_id);
  })();

  res.status(201).json({ id: paymentId, payment_number: paymentNumber, amount: payAmount.toFixed(2) });
});

// ---------------- VENDORS & BILLS (PURCHASES / AP) ----------------
apiRouter.get('/vendors', (req, res) => {
  const auth = getAuthContext(req);
  const vendors = db.prepare('SELECT * FROM vendors WHERE organization_id = ? ORDER BY name ASC').all(auth.orgId);
  res.json(vendors);
});

apiRouter.post('/vendors', (req, res) => {
  const auth = getAuthContext(req);
  const { name, company_name, email, phone, tax_number, category, payment_terms_days } = req.body;

  if (!name) return res.status(400).json({ error: 'Vendor name is required.' });

  const id = `ven-${Date.now()}`;
  db.prepare(`
    INSERT INTO vendors (id, organization_id, name, company_name, email, phone, tax_number, category, payment_terms_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, auth.orgId, name, company_name || null, email || null, phone || null, tax_number || null, category || 'General', payment_terms_days || 30);

  res.status(201).json({ id, name });
});

apiRouter.get('/bills', (req, res) => {
  const auth = getAuthContext(req);
  const bills = db.prepare(`
    SELECT b.*, v.name as vendor_name, v.company_name, a.name as expense_account_name, p.name as project_name
    FROM bills b
    JOIN vendors v ON b.vendor_id = v.id
    LEFT JOIN chart_of_accounts a ON b.expense_account_id = a.id
    LEFT JOIN projects p ON b.project_id = p.id
    WHERE b.organization_id = ?
    ORDER BY b.bill_date DESC, b.bill_number DESC
  `).all(auth.orgId);

  res.json(bills);
});

apiRouter.post('/bills', (req, res) => {
  const auth = getAuthContext(req);
  const { vendor_id, project_id, bill_number, bill_date, due_date, total_amount, expense_account_id, description } = req.body;

  if (!vendor_id || !total_amount || !expense_account_id) {
    return res.status(400).json({ error: 'Vendor, total amount, and expense account are required.' });
  }

  const billAmt = new Decimal(total_amount);
  const billId = `bill-${Date.now()}`;
  const bNumber = bill_number || `BILL-${Date.now().toString().slice(-6)}`;

  db.prepare(`
    INSERT INTO bills (
      id, organization_id, vendor_id, project_id, bill_number, bill_date, due_date,
      status, subtotal, total_amount, paid_amount, balance_due, expense_account_id, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    billId,
    auth.orgId,
    vendor_id,
    project_id || null,
    bNumber,
    bill_date || new Date().toISOString().split('T')[0],
    due_date || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    'pending_approval',
    billAmt.toFixed(2),
    billAmt.toFixed(2),
    '0.00',
    billAmt.toFixed(2),
    expense_account_id,
    description || null
  );

  AccountingEngine.logAudit({
    organization_id: auth.orgId,
    user_id: auth.userId,
    user_email: auth.userEmail,
    action: 'CREATE_BILL',
    entity_type: 'BILL',
    entity_id: billId,
    details: `Created vendor bill ${bNumber} for ${billAmt.toFixed(2)} (pending approval).`
  });

  res.status(201).json({ id: billId, bill_number: bNumber });
});

apiRouter.post('/bills/:id/approve', (req, res) => {
  const auth = getAuthContext(req);
  const bill = db.prepare('SELECT * FROM bills WHERE id = ? AND organization_id = ?').get(req.params.id, auth.orgId) as any;

  if (!bill) return res.status(404).json({ error: 'Bill not found.' });
  if (bill.status !== 'pending_approval') {
    return res.status(400).json({ error: `Bill is already ${bill.status}.` });
  }

  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(bill.vendor_id) as any;
  const apAccount = db.prepare(`SELECT * FROM chart_of_accounts WHERE organization_id = ? AND sub_type = 'accounts_payable'`).get(auth.orgId) as any;
  const expAccount = db.prepare('SELECT * FROM chart_of_accounts WHERE id = ?').get(bill.expense_account_id) as any;

  db.transaction(() => {
    // Double-Entry: Debit Expense Account, Credit Accounts Payable
    const journalLines = [
      {
        account_id: expAccount.id,
        account_code: expAccount.code,
        account_name: expAccount.name,
        description: `Expense recognized from Bill ${bill.bill_number}: ${bill.description || ''}`,
        debit: bill.total_amount,
        credit: '0.00',
        project_id: bill.project_id || null,
        vendor_id: bill.vendor_id
      },
      {
        account_id: apAccount.id,
        account_code: apAccount.code,
        account_name: apAccount.name,
        description: `Trade Payable to ${vendor.name} for Bill ${bill.bill_number}`,
        debit: '0.00',
        credit: bill.total_amount,
        project_id: bill.project_id || null,
        vendor_id: bill.vendor_id
      }
    ];

    const journalId = AccountingEngine.postJournalEntry({
      organization_id: auth.orgId,
      entry_date: bill.bill_date,
      posting_date: bill.bill_date,
      source_type: 'bill',
      source_id: bill.id,
      reference: bill.bill_number,
      memo: `Approved Vendor Bill ${bill.bill_number} from ${vendor.name}`,
      lines: journalLines,
      created_by: auth.userId,
      posted_by: auth.userId
    });

    db.prepare(`
      UPDATE bills SET status = 'approved', approved_by = ?, approved_at = ?, journal_entry_id = ? WHERE id = ?
    `).run(auth.userId, new Date().toISOString(), journalId, bill.id);

    // Update vendor balance
    const newVenBal = new Decimal(vendor.balance || 0).plus(new Decimal(bill.total_amount));
    db.prepare('UPDATE vendors SET balance = ? WHERE id = ?').run(newVenBal.toFixed(2), vendor.id);

    // Update project actual cost if linked
    if (bill.project_id) {
      const proj = db.prepare('SELECT * FROM projects WHERE id = ?').get(bill.project_id) as any;
      if (proj) {
        const newActual = new Decimal(proj.actual_cost || 0).plus(new Decimal(bill.total_amount));
        db.prepare('UPDATE projects SET actual_cost = ? WHERE id = ?').run(newActual.toFixed(2), bill.project_id);
      }
    }
  })();

  res.json({ success: true, message: 'Bill approved and ledger posted.' });
});

apiRouter.post('/bills/:id/pay', (req, res) => {
  const auth = getAuthContext(req);
  const { amount, bank_account_id, payment_date, payment_method, reference } = req.body;

  const bill = db.prepare('SELECT * FROM bills WHERE id = ? AND organization_id = ?').get(req.params.id, auth.orgId) as any;
  if (!bill) return res.status(404).json({ error: 'Bill not found.' });

  const payAmt = new Decimal(amount || bill.balance_due);
  const bank = db.prepare('SELECT * FROM bank_accounts WHERE id = ? AND organization_id = ?').get(bank_account_id, auth.orgId) as any;
  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(bill.vendor_id) as any;
  const apAccount = db.prepare(`SELECT * FROM chart_of_accounts WHERE organization_id = ? AND sub_type = 'accounts_payable'`).get(auth.orgId) as any;
  const bankLedger = db.prepare('SELECT * FROM chart_of_accounts WHERE id = ?').get(bank.account_id) as any;

  const paymentDate = payment_date || new Date().toISOString().split('T')[0];
  const pmtNumber = `BP-${Date.now().toString().slice(-6)}`;
  const pmtId = `bpmt-${Date.now()}`;

  db.transaction(() => {
    // Double-Entry: Debit Accounts Payable, Credit Bank
    const journalLines = [
      {
        account_id: apAccount.id,
        account_code: apAccount.code,
        account_name: apAccount.name,
        description: `Settlement of AP to ${vendor.name} via ${pmtNumber}`,
        debit: payAmt.toFixed(2),
        credit: '0.00',
        vendor_id: vendor.id
      },
      {
        account_id: bankLedger.id,
        account_code: bankLedger.code,
        account_name: bankLedger.name,
        description: `Disbursement from ${bank.account_name} for Bill ${bill.bill_number}`,
        debit: '0.00',
        credit: payAmt.toFixed(2),
        vendor_id: vendor.id
      }
    ];

    const journalId = AccountingEngine.postJournalEntry({
      organization_id: auth.orgId,
      entry_date: paymentDate,
      posting_date: paymentDate,
      source_type: 'bill_payment',
      source_id: pmtId,
      reference: pmtNumber,
      memo: `Vendor Bill Payment ${pmtNumber} to ${vendor.name}`,
      lines: journalLines,
      created_by: auth.userId,
      posted_by: auth.userId
    });

    db.prepare(`
      INSERT INTO bill_payments (
        id, organization_id, bill_id, vendor_id, payment_number, payment_date, amount,
        bank_account_id, payment_method, reference, journal_entry_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pmtId, auth.orgId, bill.id, vendor.id, pmtNumber, paymentDate, payAmt.toFixed(2),
      bank_account_id, payment_method || 'bank_transfer', reference || null, journalId
    );

    // Update bill
    const newPaid = new Decimal(bill.paid_amount || 0).plus(payAmt);
    const newBal = new Decimal(bill.balance_due || 0).minus(payAmt);
    const newStatus = newBal.isZero() ? 'paid' : 'partially_paid';

    db.prepare(`UPDATE bills SET paid_amount = ?, balance_due = ?, status = ? WHERE id = ?`)
      .run(newPaid.toFixed(2), newBal.toFixed(2), newStatus, bill.id);

    // Update bank balance
    const newBankBal = new Decimal(bank.current_balance || 0).minus(payAmt);
    db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?').run(newBankBal.toFixed(2), bank_account_id);

    // Update vendor balance
    const newVenBal = new Decimal(vendor.balance || 0).minus(payAmt);
    db.prepare('UPDATE vendors SET balance = ? WHERE id = ?').run(newVenBal.toFixed(2), vendor.id);
  })();

  res.json({ success: true, message: 'Vendor bill paid successfully.' });
});

// ---------------- BANKING & CASH ----------------
apiRouter.get('/bank-accounts', (req, res) => {
  const auth = getAuthContext(req);
  const accounts = db.prepare(`
    SELECT b.*, a.code as account_code, a.name as ledger_account_name
    FROM bank_accounts b
    JOIN chart_of_accounts a ON b.account_id = a.id
    WHERE b.organization_id = ?
    ORDER BY b.is_petty_cash ASC, b.account_name ASC
  `).all(auth.orgId);

  res.json(accounts);
});

apiRouter.post('/bank-transfers', (req, res) => {
  const auth = getAuthContext(req);
  const { from_bank_id, to_bank_id, amount, transfer_date, reference, notes } = req.body;

  if (!from_bank_id || !to_bank_id || !amount) {
    return res.status(400).json({ error: 'Source account, destination account, and amount are required.' });
  }

  if (from_bank_id === to_bank_id) {
    return res.status(400).json({ error: 'Source and destination accounts must be different.' });
  }

  const transferAmount = new Decimal(amount);
  const fromBank = db.prepare('SELECT * FROM bank_accounts WHERE id = ? AND organization_id = ?').get(from_bank_id, auth.orgId) as any;
  const toBank = db.prepare('SELECT * FROM bank_accounts WHERE id = ? AND organization_id = ?').get(to_bank_id, auth.orgId) as any;

  if (!fromBank || !toBank) return res.status(404).json({ error: 'Bank accounts not found.' });

  const fromLedger = db.prepare('SELECT * FROM chart_of_accounts WHERE id = ?').get(fromBank.account_id) as any;
  const toLedger = db.prepare('SELECT * FROM chart_of_accounts WHERE id = ?').get(toBank.account_id) as any;

  const tDate = transfer_date || new Date().toISOString().split('T')[0];
  const ref = reference || `TRF-${Date.now().toString().slice(-6)}`;

  db.transaction(() => {
    // Double Entry: Debit ToBank, Credit FromBank
    const journalLines = [
      {
        account_id: toLedger.id,
        account_code: toLedger.code,
        account_name: toLedger.name,
        description: `Fund transfer in from ${fromBank.account_name}`,
        debit: transferAmount.toFixed(2),
        credit: '0.00'
      },
      {
        account_id: fromLedger.id,
        account_code: fromLedger.code,
        account_name: fromLedger.name,
        description: `Fund transfer out to ${toBank.account_name}`,
        debit: '0.00',
        credit: transferAmount.toFixed(2)
      }
    ];

    AccountingEngine.postJournalEntry({
      organization_id: auth.orgId,
      entry_date: tDate,
      posting_date: tDate,
      source_type: 'bank_transfer',
      reference: ref,
      memo: `Internal Bank Transfer: ${fromBank.account_name} -> ${toBank.account_name}`,
      lines: journalLines,
      created_by: auth.userId,
      posted_by: auth.userId
    });

    db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?')
      .run(new Decimal(fromBank.current_balance).minus(transferAmount).toFixed(2), from_bank_id);
    db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?')
      .run(new Decimal(toBank.current_balance).plus(transferAmount).toFixed(2), to_bank_id);
  })();

  res.json({ success: true, message: 'Transfer completed and reconciled.' });
});

// ---------------- SOFTWARE HOUSE PROJECT FINANCE ----------------
apiRouter.get('/projects', (req, res) => {
  const auth = getAuthContext(req);
  const projects = db.prepare(`
    SELECT p.*, c.name as client_name, c.company_name
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    WHERE p.organization_id = ?
    ORDER BY p.start_date DESC
  `).all(auth.orgId) as any[];

  // Calculate gross margin and remaining receivables
  for (const p of projects) {
    const invoiced = new Decimal(p.invoiced_amount || 0);
    const collected = new Decimal(p.collected_amount || 0);
    const actualCost = new Decimal(p.actual_cost || 0);
    const contract = new Decimal(p.contract_value || 0);

    const grossProfit = invoiced.minus(actualCost);
    const margin = invoiced.isZero() ? 0 : grossProfit.dividedBy(invoiced).times(100).toNumber();

    p.gross_profit = grossProfit.toFixed(2);
    p.margin_percent = margin.toFixed(1);
    p.outstanding_receivables = invoiced.minus(collected).toFixed(2);
    p.budget_variance = new Decimal(p.budget_cost_baseline || 0).minus(actualCost).toFixed(2);
  }

  res.json(projects);
});

apiRouter.post('/projects', (req, res) => {
  const auth = getAuthContext(req);
  const { code, name, client_id, billing_model, contract_value, budget_cost_baseline, planned_labor_cost, start_date, end_date } = req.body;

  if (!code || !name) return res.status(400).json({ error: 'Project code and name are required.' });

  const id = `prj-${Date.now()}`;
  db.prepare(`
    INSERT INTO projects (
      id, organization_id, code, name, client_id, billing_model,
      contract_value, budget_cost_baseline, planned_labor_cost, start_date, end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, auth.orgId, code, name, client_id || null, billing_model || 'fixed_price',
    new Decimal(contract_value || 0).toFixed(2),
    new Decimal(budget_cost_baseline || 0).toFixed(2),
    new Decimal(planned_labor_cost || 0).toFixed(2),
    start_date || new Date().toISOString().split('T')[0],
    end_date || null
  );

  res.status(201).json({ id, code, name });
});

// ---------------- PAYROLL ACCOUNTING ----------------
apiRouter.get('/payroll', (req, res) => {
  const auth = getAuthContext(req);
  const runs = db.prepare('SELECT * FROM payroll_runs WHERE organization_id = ? ORDER BY period_year DESC, period_month DESC').all(auth.orgId) as any[];
  for (const r of runs) {
    r.items = db.prepare('SELECT * FROM payroll_items WHERE payroll_run_id = ?').all(r.id);
  }
  res.json(runs);
});

apiRouter.post('/payroll', (req, res) => {
  const auth = getAuthContext(req);
  const { period_month, period_year, employees } = req.body;

  if (!employees || employees.length === 0) {
    return res.status(400).json({ error: 'At least one employee salary is required.' });
  }

  let totalGross = new Decimal(0);
  let totalTax = new Decimal(0);
  let totalNet = new Decimal(0);

  for (const emp of employees) {
    const base = new Decimal(emp.base_salary || 0);
    const allow = new Decimal(emp.allowances || 0);
    const gross = base.plus(allow);
    const tax = new Decimal(emp.tax_withheld || 0);
    const net = gross.minus(tax);

    totalGross = totalGross.plus(gross);
    totalTax = totalTax.plus(tax);
    totalNet = totalNet.plus(net);
  }

  const runId = `pay-${Date.now()}`;
  db.transaction(() => {
    db.prepare(`
      INSERT INTO payroll_runs (
        id, organization_id, period_month, period_year, status,
        total_gross_pay, total_tax_withheld, total_net_pay
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(runId, auth.orgId, period_month, period_year, 'draft', totalGross.toFixed(2), totalTax.toFixed(2), totalNet.toFixed(2));

    const insertEmp = db.prepare(`
      INSERT INTO payroll_items (id, payroll_run_id, employee_name, designation, base_salary, allowances, deductions, tax_withheld, net_salary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < employees.length; i++) {
      const e = employees[i];
      const base = new Decimal(e.base_salary || 0);
      const allow = new Decimal(e.allowances || 0);
      const tax = new Decimal(e.tax_withheld || 0);
      const net = base.plus(allow).minus(tax);
      insertEmp.run(`pemp-${runId}-${i + 1}`, runId, e.employee_name, e.designation || 'Engineer', base.toFixed(2), allow.toFixed(2), '0.00', tax.toFixed(2), net.toFixed(2));
    }
  })();

  res.status(201).json({ id: runId, total_net_pay: totalNet.toFixed(2) });
});

apiRouter.post('/payroll/:id/disburse', (req, res) => {
  const auth = getAuthContext(req);
  const { bank_account_id, payment_date } = req.body;

  const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ? AND organization_id = ?').get(req.params.id, auth.orgId) as any;
  if (!run) return res.status(404).json({ error: 'Payroll run not found.' });

  const bank = db.prepare('SELECT * FROM bank_accounts WHERE id = ? AND organization_id = ?').get(bank_account_id, auth.orgId) as any;
  if (!bank) return res.status(404).json({ error: 'Bank account not found.' });

  const salaryExpAccount = db.prepare(`SELECT * FROM chart_of_accounts WHERE organization_id = ? AND code = '5010'`).get(auth.orgId) as any;
  const taxWithheldAccount = db.prepare(`SELECT * FROM chart_of_accounts WHERE organization_id = ? AND code = '2300'`).get(auth.orgId) as any;
  const bankLedger = db.prepare('SELECT * FROM chart_of_accounts WHERE id = ?').get(bank.account_id) as any;

  const pDate = payment_date || new Date().toISOString().split('T')[0];

  db.transaction(() => {
    // Double Entry:
    // Debit: Salary Expense (total_gross_pay)
    // Credit: Tax Withheld Payable (total_tax_withheld)
    // Credit: Bank Account (total_net_pay)
    const journalLines = [
      {
        account_id: salaryExpAccount.id,
        account_code: salaryExpAccount.code,
        account_name: salaryExpAccount.name,
        description: `Payroll gross salaries for ${run.period_month}/${run.period_year}`,
        debit: run.total_gross_pay,
        credit: '0.00'
      },
      {
        account_id: bankLedger.id,
        account_code: bankLedger.code,
        account_name: bankLedger.name,
        description: `Net salary disbursement via ${bank.account_name}`,
        debit: '0.00',
        credit: run.total_net_pay
      }
    ];

    if (new Decimal(run.total_tax_withheld).greaterThan(0)) {
      journalLines.push({
        account_id: taxWithheldAccount.id,
        account_code: taxWithheldAccount.code,
        account_name: taxWithheldAccount.name,
        description: `FBR tax withheld from payroll`,
        debit: '0.00',
        credit: run.total_tax_withheld
      });
    }

    const journalId = AccountingEngine.postJournalEntry({
      organization_id: auth.orgId,
      entry_date: pDate,
      posting_date: pDate,
      source_type: 'payroll',
      source_id: run.id,
      reference: `PAY-${run.period_year}-${run.period_month}`,
      memo: `Payroll disbursement for ${run.period_month}/${run.period_year}`,
      lines: journalLines,
      created_by: auth.userId,
      posted_by: auth.userId
    });

    db.prepare(`
      UPDATE payroll_runs SET status = 'paid', bank_account_id = ?, journal_entry_id = ?, disbursed_at = ? WHERE id = ?
    `).run(bank_account_id, journalId, new Date().toISOString(), run.id);

    // Update bank balance
    db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?')
      .run(new Decimal(bank.current_balance).minus(new Decimal(run.total_net_pay)).toFixed(2), bank_account_id);
  })();

  res.json({ success: true, message: 'Payroll disbursed and accounting journals posted.' });
});

// ---------------- PARTNER EQUITY & CAPITAL ----------------
apiRouter.get('/equity', (req, res) => {
  const auth = getAuthContext(req);
  const transactions = db.prepare(`
    SELECT e.*, b.account_name as bank_name
    FROM partner_equity_transactions e
    JOIN bank_accounts b ON e.bank_account_id = b.id
    WHERE e.organization_id = ?
    ORDER BY e.date DESC
  `).all(auth.orgId);

  res.json(transactions);
});

apiRouter.post('/equity', (req, res) => {
  const auth = getAuthContext(req);
  const { partner_name, transaction_type, amount, date, bank_account_id, notes } = req.body;

  if (!partner_name || !transaction_type || !amount || !bank_account_id) {
    return res.status(400).json({ error: 'Partner name, transaction type, amount, and bank account are required.' });
  }

  const amt = new Decimal(amount);
  const bank = db.prepare('SELECT * FROM bank_accounts WHERE id = ? AND organization_id = ?').get(bank_account_id, auth.orgId) as any;
  const bankLedger = db.prepare('SELECT * FROM chart_of_accounts WHERE id = ?').get(bank.account_id) as any;

  // Find partner capital account (code 3010 or 3020)
  const capitalAccount = db.prepare(`SELECT * FROM chart_of_accounts WHERE organization_id = ? AND type = 'equity' ORDER BY code ASC LIMIT 1`).get(auth.orgId) as any;

  const tDate = date || new Date().toISOString().split('T')[0];
  const eqId = `eq-${Date.now()}`;

  db.transaction(() => {
    let journalLines: any[] = [];

    if (transaction_type === 'capital_contribution') {
      // Debit: Bank, Credit: Partner Capital
      journalLines = [
        {
          account_id: bankLedger.id,
          account_code: bankLedger.code,
          account_name: bankLedger.name,
          description: `Capital contributed by ${partner_name}`,
          debit: amt.toFixed(2),
          credit: '0.00'
        },
        {
          account_id: capitalAccount.id,
          account_code: capitalAccount.code,
          account_name: capitalAccount.name,
          description: `Capital injection by ${partner_name}`,
          debit: '0.00',
          credit: amt.toFixed(2)
        }
      ];

      // Update bank balance
      db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?')
        .run(new Decimal(bank.current_balance).plus(amt).toFixed(2), bank_account_id);
    } else {
      // Drawing / Distribution: Debit Partner Capital, Credit Bank
      journalLines = [
        {
          account_id: capitalAccount.id,
          account_code: capitalAccount.code,
          account_name: capitalAccount.name,
          description: `Drawing / Profit distribution to ${partner_name}`,
          debit: amt.toFixed(2),
          credit: '0.00'
        },
        {
          account_id: bankLedger.id,
          account_code: bankLedger.code,
          account_name: bankLedger.name,
          description: `Disbursement to partner ${partner_name}`,
          debit: '0.00',
          credit: amt.toFixed(2)
        }
      ];

      // Update bank balance
      db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?')
        .run(new Decimal(bank.current_balance).minus(amt).toFixed(2), bank_account_id);
    }

    const journalId = AccountingEngine.postJournalEntry({
      organization_id: auth.orgId,
      entry_date: tDate,
      posting_date: tDate,
      source_type: 'partner_equity',
      source_id: eqId,
      reference: `EQ-${Date.now().toString().slice(-6)}`,
      memo: `Partner Equity ${transaction_type} - ${partner_name}`,
      lines: journalLines,
      created_by: auth.userId,
      posted_by: auth.userId
    });

    db.prepare(`
      INSERT INTO partner_equity_transactions (id, organization_id, partner_name, transaction_type, amount, date, bank_account_id, notes, journal_entry_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(eqId, auth.orgId, partner_name, transaction_type, amt.toFixed(2), tDate, bank_account_id, notes || null, journalId);
  })();

  res.status(201).json({ id: eqId });
});

// ---------------- FIXED ASSETS ----------------
apiRouter.get('/assets', (req, res) => {
  const auth = getAuthContext(req);
  const assets = db.prepare('SELECT * FROM fixed_assets WHERE organization_id = ? ORDER BY purchase_date DESC').all(auth.orgId);
  res.json(assets);
});

apiRouter.post('/assets/depreciate', (req, res) => {
  const auth = getAuthContext(req);
  const { asset_id } = req.body;

  const asset = db.prepare('SELECT * FROM fixed_assets WHERE id = ? AND organization_id = ?').get(asset_id, auth.orgId) as any;
  if (!asset) return res.status(404).json({ error: 'Asset not found.' });

  // Compute 1 month depreciation straight line: (purchase_cost - salvage_value) / (useful_life_years * 12)
  const cost = new Decimal(asset.purchase_cost);
  const salvage = new Decimal(asset.salvage_value || 0);
  const months = asset.useful_life_years * 12;
  const monthlyDep = cost.minus(salvage).dividedBy(months).toDecimalPlaces(2);

  const expAccount = db.prepare('SELECT * FROM chart_of_accounts WHERE id = ?').get(asset.depreciation_expense_account_id) as any;
  const accumAccount = db.prepare('SELECT * FROM chart_of_accounts WHERE id = ?').get(asset.accumulated_depreciation_account_id) as any;

  const today = new Date().toISOString().split('T')[0];

  db.transaction(() => {
    // Double Entry: Debit Depreciation Expense, Credit Accumulated Depreciation
    const journalLines = [
      {
        account_id: expAccount.id,
        account_code: expAccount.code,
        account_name: expAccount.name,
        description: `Depreciation for ${asset.name}`,
        debit: monthlyDep.toFixed(2),
        credit: '0.00'
      },
      {
        account_id: accumAccount.id,
        account_code: accumAccount.code,
        account_name: accumAccount.name,
        description: `Accumulated depreciation - ${asset.asset_code}`,
        debit: '0.00',
        credit: monthlyDep.toFixed(2)
      }
    ];

    AccountingEngine.postJournalEntry({
      organization_id: auth.orgId,
      entry_date: today,
      posting_date: today,
      source_type: 'asset_depreciation',
      source_id: asset.id,
      reference: `DEP-${asset.asset_code}`,
      memo: `Monthly depreciation for asset ${asset.asset_code} (${asset.name})`,
      lines: journalLines,
      created_by: auth.userId,
      posted_by: auth.userId
    });

    const newAccum = new Decimal(asset.accumulated_depreciation || 0).plus(monthlyDep);
    const newBookVal = cost.minus(newAccum);

    db.prepare('UPDATE fixed_assets SET accumulated_depreciation = ?, net_book_value = ? WHERE id = ?')
      .run(newAccum.toFixed(2), newBookVal.toFixed(2), asset.id);
  })();

  res.json({ success: true, monthly_depreciation: monthlyDep.toFixed(2) });
});

// ---------------- FINANCIAL REPORTS & DASHBOARD ----------------
apiRouter.get('/reports/dashboard-kpis', (req, res) => {
  const auth = getAuthContext(req);

  const bankTotal = db.prepare(`
    SELECT COALESCE(SUM(CAST(current_balance AS NUMERIC)), 0) as total
    FROM bank_accounts WHERE organization_id = ?
  `).get(auth.orgId) as { total: number };

  const arTotal = db.prepare(`
    SELECT COALESCE(SUM(CAST(balance_due AS NUMERIC)), 0) as total, count(*) as count
    FROM invoices WHERE organization_id = ? AND status IN ('sent', 'partially_paid', 'overdue')
  `).get(auth.orgId) as { total: number; count: number };

  const apTotal = db.prepare(`
    SELECT COALESCE(SUM(CAST(balance_due AS NUMERIC)), 0) as total, count(*) as count
    FROM bills WHERE organization_id = ? AND status IN ('approved', 'partially_paid')
  `).get(auth.orgId) as { total: number; count: number };

  const pl = AccountingEngine.getProfitAndLoss({ organization_id: auth.orgId });

  res.json({
    total_cash_and_bank: new Decimal(bankTotal.total).toFixed(2),
    accounts_receivable: new Decimal(arTotal.total).toFixed(2),
    open_invoices_count: arTotal.count,
    accounts_payable: new Decimal(apTotal.total).toFixed(2),
    open_bills_count: apTotal.count,
    total_revenue: pl.revenue.total,
    gross_profit: pl.gross_profit,
    gross_margin_percent: pl.gross_margin_percent,
    net_operating_income: pl.net_operating_income,
    net_profit_margin_percent: pl.net_profit_margin_percent
  });
});

apiRouter.get('/reports/trial-balance', (req, res) => {
  const auth = getAuthContext(req);
  const result = AccountingEngine.getTrialBalance({
    organization_id: auth.orgId,
    as_of_date: req.query.as_of_date as string
  });
  res.json(result);
});

apiRouter.get('/reports/profit-loss', (req, res) => {
  const auth = getAuthContext(req);
  const result = AccountingEngine.getProfitAndLoss({
    organization_id: auth.orgId,
    start_date: req.query.start_date as string,
    end_date: req.query.end_date as string
  });
  res.json(result);
});

apiRouter.get('/reports/balance-sheet', (req, res) => {
  const auth = getAuthContext(req);
  const result = AccountingEngine.getBalanceSheet({
    organization_id: auth.orgId,
    as_of_date: req.query.as_of_date as string
  });
  res.json(result);
});

apiRouter.get('/reports/cash-flow', (req, res) => {
  const auth = getAuthContext(req);
  const result = AccountingEngine.getCashFlowStatement(auth.orgId);
  res.json(result);
});

apiRouter.get('/reports/general-ledger', (req, res) => {
  const auth = getAuthContext(req);
  const result = AccountingEngine.getGeneralLedger({
    organization_id: auth.orgId,
    account_id: req.query.account_id as string,
    project_id: req.query.project_id as string,
    start_date: req.query.start_date as string,
    end_date: req.query.end_date as string
  });
  res.json(result);
});

apiRouter.get('/reports/ar-aging', (req, res) => {
  const auth = getAuthContext(req);
  const result = AccountingEngine.getARAging(auth.orgId);
  res.json(result);
});

apiRouter.get('/reports/ap-aging', (req, res) => {
  const auth = getAuthContext(req);
  const result = AccountingEngine.getAPAging(auth.orgId);
  res.json(result);
});

apiRouter.get('/reports/audit', (req, res) => {
  const auth = getAuthContext(req);
  const logs = db.prepare(`
    SELECT * FROM audit_events
    WHERE organization_id = ?
    ORDER BY timestamp DESC
    LIMIT 100
  `).all(auth.orgId);
  res.json(logs);
});

// ---------------- MODE B: CLIENT FINANCE INTEGRATION API ----------------
apiRouter.post('/v1/client-finance/pos-sale', (req, res) => {
  const auth = getAuthContext(req);
  const { idempotency_key, source_app, external_order_id, customer_name, subtotal, tax_amount, tender_type, items } = req.body;

  if (!idempotency_key) {
    return res.status(400).json({ error: 'Idempotency-Key is required for external financial transactions.' });
  }

  // Check existing processed event
  const existing = db.prepare(`
    SELECT * FROM integration_events WHERE organization_id = ? AND idempotency_key = ?
  `).get(auth.orgId, idempotency_key) as any;

  if (existing) {
    return res.json({
      status: 'duplicate_ignored',
      message: 'Transaction already processed previously under this idempotency key.',
      journal_entry_id: existing.processed_journal_id
    });
  }

  const sub = new Decimal(subtotal || 0);
  const tax = new Decimal(tax_amount || 0);
  const total = sub.plus(tax);

  // Cash/Bank account
  const bank = db.prepare(`SELECT * FROM bank_accounts WHERE organization_id = ? LIMIT 1`).get(auth.orgId) as any;
  const bankLedger = db.prepare(`SELECT * FROM chart_of_accounts WHERE id = ?`).get(bank.account_id) as any;
  const revAccount = db.prepare(`SELECT * FROM chart_of_accounts WHERE organization_id = ? AND type = 'revenue' LIMIT 1`).get(auth.orgId) as any;
  const taxAccount = db.prepare(`SELECT * FROM chart_of_accounts WHERE organization_id = ? AND code LIKE '%23%' LIMIT 1`).get(auth.orgId) as any;

  const today = new Date().toISOString().split('T')[0];

  let journalId = '';
  try {
    db.transaction(() => {
      const lines = [
        {
          account_id: bankLedger.id,
          account_code: bankLedger.code,
          account_name: bankLedger.name,
          description: `POS tender receipt for Order #${external_order_id || 'N/A'} (${tender_type || 'cash'})`,
          debit: total.toFixed(2),
          credit: '0.00'
        },
        {
          account_id: revAccount.id,
          account_code: revAccount.code,
          account_name: revAccount.name,
          description: `POS Sales Revenue - Order #${external_order_id || 'N/A'}`,
          debit: '0.00',
          credit: sub.toFixed(2)
        }
      ];

      if (tax.greaterThan(0) && taxAccount) {
        lines.push({
          account_id: taxAccount.id,
          account_code: taxAccount.code,
          account_name: taxAccount.name,
          description: `Sales Tax on POS Order #${external_order_id || 'N/A'}`,
          debit: '0.00',
          credit: tax.toFixed(2)
        });
      }

      journalId = AccountingEngine.postJournalEntry({
        organization_id: auth.orgId,
        entry_date: today,
        posting_date: today,
        source_type: 'pos_integration',
        reference: external_order_id || `POS-${Date.now()}`,
        memo: `Client Integration POS Sale - Order #${external_order_id || 'N/A'} (${source_app || 'RetailPOS'})`,
        lines,
        idempotency_key
      });

      // Update bank balance
      db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?')
        .run(new Decimal(bank.current_balance).plus(total).toFixed(2), bank.id);

      // Record event
      db.prepare(`
        INSERT INTO integration_events (
          id, organization_id, source_app, event_type, idempotency_key, payload, status, processed_journal_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `evt-${Date.now()}`,
        auth.orgId,
        source_app || 'retail_pos',
        'pos_sale',
        idempotency_key,
        JSON.stringify(req.body),
        'processed',
        journalId
      );
    })();

    res.status(201).json({
      status: 'success',
      processed_journal_id: journalId,
      amount_settled: total.toFixed(2),
      message: 'POS transaction integrated and general ledger posted atomically.'
    });
  } catch (err: any) {
    res.status(400).json({ status: 'error', error: err.message });
  }
});

apiRouter.get('/v1/client-finance/events', (req, res) => {
  const auth = getAuthContext(req);
  const events = db.prepare(`
    SELECT * FROM integration_events
    WHERE organization_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(auth.orgId);
  res.json(events);
});
