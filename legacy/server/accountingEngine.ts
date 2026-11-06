import { Decimal } from 'decimal.js';
import { db } from './db.js';

// Configure Decimal for financial precision (2 decimal places standard for reporting, rounding half-up)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface JournalLineInput {
  account_id: string;
  account_code: string;
  account_name: string;
  description?: string;
  debit: string | number;
  credit: string | number;
  project_id?: string | null;
  client_id?: string | null;
  vendor_id?: string | null;
}

export interface CreateJournalEntryInput {
  organization_id: string;
  entry_date: string;
  posting_date: string;
  source_type: string;
  source_id?: string | null;
  reference?: string | null;
  memo: string;
  lines: JournalLineInput[];
  created_by?: string | null;
  posted_by?: string | null;
  idempotency_key?: string | null;
}

export class AccountingEngine {
  /**
   * Log action to the append-only audit trail
   */
  static logAudit(params: {
    organization_id: string;
    user_id?: string | null;
    user_email?: string | null;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    details: string;
    ip_address?: string | null;
  }) {
    const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    db.prepare(`
      INSERT INTO audit_events (id, organization_id, user_id, user_email, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.organization_id,
      params.user_id || null,
      params.user_email || null,
      params.action,
      params.entity_type,
      params.entity_id || null,
      params.details,
      params.ip_address || '127.0.0.1'
    );
  }

  /**
   * Validate if the given date falls into an open (unlocked) fiscal period
   */
  static validatePeriodOpen(organization_id: string, dateStr: string): void {
    const lockedPeriod = db.prepare(`
      SELECT name, is_locked FROM fiscal_periods
      WHERE organization_id = ?
        AND ? BETWEEN start_date AND end_date
        AND is_locked = 1
    `).get(organization_id, dateStr) as { name: string; is_locked: number } | undefined;

    if (lockedPeriod) {
      throw new Error(`Posting date ${dateStr} falls into a LOCKED accounting period (${lockedPeriod.name}). Unlocking required by authorized administrator.`);
    }
  }

  /**
   * Validate double entry balance: Total Debits == Total Credits
   */
  static validateBalance(lines: JournalLineInput[]): { totalDebit: Decimal; totalCredit: Decimal } {
    if (!lines || lines.length < 2) {
      throw new Error('A double-entry journal must contain at least two line items (one debit and one credit).');
    }

    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const d = new Decimal(line.debit || 0);
      const c = new Decimal(line.credit || 0);

      if (d.isNegative() || c.isNegative()) {
        throw new Error(`Line ${i + 1} has negative amounts. Debits and credits must be non-negative.`);
      }

      if (d.greaterThan(0) && c.greaterThan(0)) {
        throw new Error(`Line ${i + 1} has both debit and credit amounts. Each line must be either a debit or credit.`);
      }

      totalDebit = totalDebit.plus(d);
      totalCredit = totalCredit.plus(c);
    }

    if (totalDebit.isZero() && totalCredit.isZero()) {
      throw new Error('Journal transaction cannot have zero total amounts.');
    }

    const difference = totalDebit.minus(totalCredit).abs();
    if (difference.greaterThan('0.0001')) {
      throw new Error(
        `Journal entry does not balance! Total Debits (${totalDebit.toFixed(2)}) must equal Total Credits (${totalCredit.toFixed(2)}). Discrepancy: ${difference.toFixed(2)}.`
      );
    }

    return { totalDebit, totalCredit };
  }

  /**
   * Post a balanced journal entry atomically
   */
  static postJournalEntry(input: CreateJournalEntryInput): string {
    // 1. Idempotency check if key provided
    if (input.idempotency_key) {
      const existing = db.prepare(`
        SELECT id FROM journal_entries
        WHERE organization_id = ? AND idempotency_key = ?
      `).get(input.organization_id, input.idempotency_key) as { id: string } | undefined;

      if (existing) {
        return existing.id; // Already processed, return existing ID
      }
    }

    // 2. Validate period is unlocked
    this.validatePeriodOpen(input.organization_id, input.posting_date);

    // 3. Validate double-entry equality
    const { totalDebit, totalCredit } = this.validateBalance(input.lines);

    // 4. Generate sequential entry number
    const year = new Date(input.posting_date).getFullYear();
    const countResult = db.prepare(`
      SELECT count(*) as count FROM journal_entries
      WHERE organization_id = ? AND strftime('%Y', posting_date) = ?
    `).get(input.organization_id, year.toString()) as { count: number };

    const seq = (countResult.count + 1).toString().padStart(4, '0');
    const entryNumber = `JRN-${year}-${seq}`;
    const journalId = `jrn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // 5. Execute transaction
    const executePost = db.transaction(() => {
      db.prepare(`
        INSERT INTO journal_entries (
          id, organization_id, entry_number, entry_date, posting_date, status,
          source_type, source_id, reference, memo, total_debit, total_credit,
          created_by, posted_by, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        journalId,
        input.organization_id,
        entryNumber,
        input.entry_date,
        input.posting_date,
        'posted',
        input.source_type,
        input.source_id || null,
        input.reference || null,
        input.memo,
        totalDebit.toFixed(2),
        totalCredit.toFixed(2),
        input.created_by || null,
        input.posted_by || null,
        input.idempotency_key || null
      );

      const insertLine = db.prepare(`
        INSERT INTO journal_lines (
          id, journal_entry_id, account_id, account_code, account_name, description,
          debit, credit, project_id, client_id, vendor_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < input.lines.length; i++) {
        const line = input.lines[i];
        const lineId = `jln-${journalId}-${i + 1}`;
        insertLine.run(
          lineId,
          journalId,
          line.account_id,
          line.account_code,
          line.account_name,
          line.description || input.memo,
          new Decimal(line.debit || 0).toFixed(2),
          new Decimal(line.credit || 0).toFixed(2),
          line.project_id || null,
          line.client_id || null,
          line.vendor_id || null
        );
      }

      this.logAudit({
        organization_id: input.organization_id,
        user_id: input.posted_by,
        action: 'POST_JOURNAL_ENTRY',
        entity_type: 'JOURNAL_ENTRY',
        entity_id: journalId,
        details: `Posted journal ${entryNumber}: "${input.memo}" totaling ${totalDebit.toFixed(2)}.`
      });
    });

    executePost();
    return journalId;
  }

  /**
   * Controlled reversal of a posted journal entry
   */
  static reverseJournalEntry(params: {
    organization_id: string;
    journal_id: string;
    reversal_date: string;
    reason: string;
    user_id?: string | null;
  }): string {
    this.validatePeriodOpen(params.organization_id, params.reversal_date);

    const sourceJournal = db.prepare(`
      SELECT * FROM journal_entries
      WHERE id = ? AND organization_id = ?
    `).get(params.journal_id, params.organization_id) as any;

    if (!sourceJournal) {
      throw new Error(`Journal entry ${params.journal_id} not found.`);
    }

    if (sourceJournal.status !== 'posted') {
      throw new Error(`Cannot reverse journal ${sourceJournal.entry_number} because its current status is "${sourceJournal.status}". Only posted journals can be reversed.`);
    }

    const lines = db.prepare(`
      SELECT * FROM journal_lines WHERE journal_entry_id = ?
    `).all(params.journal_id) as any[];

    // Swap debits and credits
    const reversedLines: JournalLineInput[] = lines.map(line => ({
      account_id: line.account_id,
      account_code: line.account_code,
      account_name: line.account_name,
      description: `Reversal of ${sourceJournal.entry_number}: ${line.description || ''}`,
      debit: line.credit, // SWAP
      credit: line.debit, // SWAP
      project_id: line.project_id,
      client_id: line.client_id,
      vendor_id: line.vendor_id
    }));

    const reversalJournalId = this.postJournalEntry({
      organization_id: params.organization_id,
      entry_date: params.reversal_date,
      posting_date: params.reversal_date,
      source_type: 'reversal',
      source_id: sourceJournal.id,
      reference: `REV-${sourceJournal.entry_number}`,
      memo: `Reversal of ${sourceJournal.entry_number}: ${params.reason}`,
      lines: reversedLines,
      created_by: params.user_id,
      posted_by: params.user_id
    });

    // Mark original journal as reversed
    db.prepare(`
      UPDATE journal_entries
      SET status = 'reversed', reversed_by_journal_id = ?
      WHERE id = ?
    `).run(reversalJournalId, sourceJournal.id);

    this.logAudit({
      organization_id: params.organization_id,
      user_id: params.user_id,
      action: 'REVERSE_JOURNAL_ENTRY',
      entity_type: 'JOURNAL_ENTRY',
      entity_id: sourceJournal.id,
      details: `Reversed journal ${sourceJournal.entry_number} via reversal journal ${reversalJournalId}. Reason: ${params.reason}`
    });

    return reversalJournalId;
  }

  /**
   * Generate General Ledger with opening balance, lines, and closing running balance
   */
  static getGeneralLedger(params: {
    organization_id: string;
    account_id?: string;
    start_date?: string;
    end_date?: string;
    project_id?: string;
  }) {
    let whereClause = `WHERE j.organization_id = ? AND j.status = 'posted'`;
    const queryParams: any[] = [params.organization_id];

    if (params.account_id) {
      whereClause += ` AND l.account_id = ?`;
      queryParams.push(params.account_id);
    }

    if (params.project_id) {
      whereClause += ` AND l.project_id = ?`;
      queryParams.push(params.project_id);
    }

    if (params.start_date) {
      whereClause += ` AND j.posting_date >= ?`;
      queryParams.push(params.start_date);
    }

    if (params.end_date) {
      whereClause += ` AND j.posting_date <= ?`;
      queryParams.push(params.end_date);
    }

    const rows = db.prepare(`
      SELECT 
        l.id as line_id,
        j.id as journal_id,
        j.entry_number,
        j.posting_date,
        j.source_type,
        j.reference,
        j.memo,
        l.account_id,
        l.account_code,
        l.account_name,
        a.type as account_type,
        l.description as line_description,
        l.debit,
        l.credit,
        l.project_id,
        p.name as project_name,
        l.client_id,
        c.name as client_name,
        l.vendor_id,
        v.name as vendor_name
      FROM journal_lines l
      JOIN journal_entries j ON l.journal_entry_id = j.id
      JOIN chart_of_accounts a ON l.account_id = a.id
      LEFT JOIN projects p ON l.project_id = p.id
      LEFT JOIN clients c ON l.client_id = c.id
      LEFT JOIN vendors v ON l.vendor_id = v.id
      ${whereClause}
      ORDER BY j.posting_date ASC, j.entry_number ASC, l.id ASC
    `).all(...queryParams) as any[];

    // Calculate running balances per account
    const accountsMap: Record<string, any> = {};

    for (const row of rows) {
      if (!accountsMap[row.account_id]) {
        accountsMap[row.account_id] = {
          account_id: row.account_id,
          account_code: row.account_code,
          account_name: row.account_name,
          account_type: row.account_type,
          total_debit: new Decimal(0),
          total_credit: new Decimal(0),
          net_balance: new Decimal(0),
          transactions: []
        };
      }

      const acc = accountsMap[row.account_id];
      const d = new Decimal(row.debit);
      const c = new Decimal(row.credit);

      acc.total_debit = acc.total_debit.plus(d);
      acc.total_credit = acc.total_credit.plus(c);

      // Normal balance: Asset & Expense = Debit - Credit; Liability, Equity, Revenue = Credit - Debit
      let lineImpact = new Decimal(0);
      if (row.account_type === 'asset' || row.account_type === 'expense') {
        lineImpact = d.minus(c);
      } else {
        lineImpact = c.minus(d);
      }

      acc.net_balance = acc.net_balance.plus(lineImpact);

      acc.transactions.push({
        ...row,
        running_balance: acc.net_balance.toFixed(2)
      });
    }

    return Object.values(accountsMap).map(acc => ({
      ...acc,
      total_debit: acc.total_debit.toFixed(2),
      total_credit: acc.total_credit.toFixed(2),
      net_balance: acc.net_balance.toFixed(2)
    }));
  }

  /**
   * Generate Trial Balance ensuring debits and credits reconcile
   */
  static getTrialBalance(params: {
    organization_id: string;
    as_of_date?: string;
  }) {
    let dateFilter = '';
    const dateParams: any[] = [];
    if (params.as_of_date) {
      dateFilter = `AND j.posting_date <= ?`;
      dateParams.push(params.as_of_date);
    }

    const rows = db.prepare(`
      SELECT 
        a.id as account_id,
        a.code,
        a.name,
        a.type,
        a.sub_type,
        COALESCE(SUM(CAST(l.debit AS NUMERIC)), 0) as total_debit,
        COALESCE(SUM(CAST(l.credit AS NUMERIC)), 0) as total_credit
      FROM chart_of_accounts a
      LEFT JOIN journal_lines l ON a.id = l.account_id
      LEFT JOIN journal_entries j ON l.journal_entry_id = j.id AND j.status = 'posted' AND j.organization_id = ? ${dateFilter}
      WHERE a.organization_id = ? AND a.is_active = 1
      GROUP BY a.id, a.code, a.name, a.type, a.sub_type
      ORDER BY a.code ASC
    `).all(params.organization_id, ...dateParams, params.organization_id) as any[];

    let sumTotalDebits = new Decimal(0);
    let sumTotalCredits = new Decimal(0);
    let sumNetDebits = new Decimal(0);
    let sumNetCredits = new Decimal(0);

    const items = rows.map(r => {
      const d = new Decimal(r.total_debit);
      const c = new Decimal(r.total_credit);

      sumTotalDebits = sumTotalDebits.plus(d);
      sumTotalCredits = sumTotalCredits.plus(c);

      let netDebit = new Decimal(0);
      let netCredit = new Decimal(0);

      if (d.greaterThan(c)) {
        netDebit = d.minus(c);
      } else {
        netCredit = c.minus(d);
      }

      sumNetDebits = sumNetDebits.plus(netDebit);
      sumNetCredits = sumNetCredits.plus(netCredit);

      return {
        account_id: r.account_id,
        code: r.code,
        name: r.name,
        type: r.type,
        sub_type: r.sub_type,
        total_debit: d.toFixed(2),
        total_credit: c.toFixed(2),
        net_debit: netDebit.toFixed(2),
        net_credit: netCredit.toFixed(2)
      };
    });

    const isBalanced = sumNetDebits.minus(sumNetCredits).abs().lessThan('0.01');

    return {
      as_of_date: params.as_of_date || new Date().toISOString().split('T')[0],
      items,
      total_debit: sumTotalDebits.toFixed(2),
      total_credit: sumTotalCredits.toFixed(2),
      total_net_debit: sumNetDebits.toFixed(2),
      total_net_credit: sumNetCredits.toFixed(2),
      is_balanced: isBalanced
    };
  }

  /**
   * Profit & Loss (Income Statement)
   */
  static getProfitAndLoss(params: {
    organization_id: string;
    start_date?: string;
    end_date?: string;
  }) {
    let dateFilter = '';
    const dateParams: any[] = [];

    if (params.start_date) {
      dateFilter += ` AND j.posting_date >= ?`;
      dateParams.push(params.start_date);
    }
    if (params.end_date) {
      dateFilter += ` AND j.posting_date <= ?`;
      dateParams.push(params.end_date);
    }

    const rows = db.prepare(`
      SELECT 
        a.id as account_id,
        a.code,
        a.name,
        a.type,
        a.sub_type,
        COALESCE(SUM(CAST(l.debit AS NUMERIC)), 0) as total_debit,
        COALESCE(SUM(CAST(l.credit AS NUMERIC)), 0) as total_credit
      FROM chart_of_accounts a
      JOIN journal_lines l ON a.id = l.account_id
      JOIN journal_entries j ON l.journal_entry_id = j.id AND j.status = 'posted' AND j.organization_id = ? ${dateFilter}
      WHERE a.organization_id = ? AND a.type IN ('revenue', 'expense')
      GROUP BY a.id, a.code, a.name, a.type, a.sub_type
      ORDER BY a.code ASC
    `).all(params.organization_id, ...dateParams, params.organization_id) as any[];

    const revenueItems: any[] = [];
    const cogsItems: any[] = [];
    const opexItems: any[] = [];

    let totalRevenue = new Decimal(0);
    let totalCogs = new Decimal(0);
    let totalOpex = new Decimal(0);

    for (const r of rows) {
      const d = new Decimal(r.total_debit);
      const c = new Decimal(r.total_credit);

      if (r.type === 'revenue') {
        // Revenue is normally Credit - Debit
        const netRev = c.minus(d);
        totalRevenue = totalRevenue.plus(netRev);
        revenueItems.push({
          account_id: r.account_id,
          code: r.code,
          name: r.name,
          sub_type: r.sub_type,
          amount: netRev.toFixed(2)
        });
      } else if (r.type === 'expense') {
        // Expense is normally Debit - Credit
        const netExp = d.minus(c);
        if (r.sub_type === 'direct_labor_cost') {
          totalCogs = totalCogs.plus(netExp);
          cogsItems.push({
            account_id: r.account_id,
            code: r.code,
            name: r.name,
            sub_type: r.sub_type,
            amount: netExp.toFixed(2)
          });
        } else {
          totalOpex = totalOpex.plus(netExp);
          opexItems.push({
            account_id: r.account_id,
            code: r.code,
            name: r.name,
            sub_type: r.sub_type,
            amount: netExp.toFixed(2)
          });
        }
      }
    }

    const grossProfit = totalRevenue.minus(totalCogs);
    const grossMarginPercent = totalRevenue.isZero() ? new Decimal(0) : grossProfit.dividedBy(totalRevenue).times(100);
    const netOperatingIncome = grossProfit.minus(totalOpex);
    const netProfitMarginPercent = totalRevenue.isZero() ? new Decimal(0) : netOperatingIncome.dividedBy(totalRevenue).times(100);

    return {
      start_date: params.start_date || 'All Time',
      end_date: params.end_date || new Date().toISOString().split('T')[0],
      revenue: {
        items: revenueItems,
        total: totalRevenue.toFixed(2)
      },
      cost_of_goods_sold: {
        items: cogsItems,
        total: totalCogs.toFixed(2)
      },
      gross_profit: grossProfit.toFixed(2),
      gross_margin_percent: grossMarginPercent.toFixed(1),
      operating_expenses: {
        items: opexItems,
        total: totalOpex.toFixed(2)
      },
      net_operating_income: netOperatingIncome.toFixed(2),
      net_profit_margin_percent: netProfitMarginPercent.toFixed(1)
    };
  }

  /**
   * Balance Sheet: Assets = Liabilities + Equity
   */
  static getBalanceSheet(params: {
    organization_id: string;
    as_of_date?: string;
  }) {
    let dateFilter = '';
    const dateParams: any[] = [];

    if (params.as_of_date) {
      dateFilter = `AND j.posting_date <= ?`;
      dateParams.push(params.as_of_date);
    }

    const rows = db.prepare(`
      SELECT 
        a.id as account_id,
        a.code,
        a.name,
        a.type,
        a.sub_type,
        COALESCE(SUM(CAST(l.debit AS NUMERIC)), 0) as total_debit,
        COALESCE(SUM(CAST(l.credit AS NUMERIC)), 0) as total_credit
      FROM chart_of_accounts a
      LEFT JOIN journal_lines l ON a.id = l.account_id
      LEFT JOIN journal_entries j ON l.journal_entry_id = j.id AND j.status = 'posted' AND j.organization_id = ? ${dateFilter}
      WHERE a.organization_id = ?
      GROUP BY a.id, a.code, a.name, a.type, a.sub_type
      ORDER BY a.code ASC
    `).all(params.organization_id, ...dateParams, params.organization_id) as any[];

    const currentAssets: any[] = [];
    const fixedAssets: any[] = [];
    const currentLiabilities: any[] = [];
    const equityItems: any[] = [];

    let totalAssets = new Decimal(0);
    let totalLiabilities = new Decimal(0);
    let totalHistoricalEquity = new Decimal(0);

    let periodRevenue = new Decimal(0);
    let periodExpense = new Decimal(0);

    for (const r of rows) {
      const d = new Decimal(r.total_debit);
      const c = new Decimal(r.total_credit);

      if (r.type === 'asset') {
        const netAsset = d.minus(c);
        totalAssets = totalAssets.plus(netAsset);

        if (r.sub_type === 'fixed_asset') {
          fixedAssets.push({
            account_id: r.account_id,
            code: r.code,
            name: r.name,
            amount: netAsset.toFixed(2)
          });
        } else {
          currentAssets.push({
            account_id: r.account_id,
            code: r.code,
            name: r.name,
            amount: netAsset.toFixed(2)
          });
        }
      } else if (r.type === 'liability') {
        const netLiab = c.minus(d);
        totalLiabilities = totalLiabilities.plus(netLiab);
        currentLiabilities.push({
          account_id: r.account_id,
          code: r.code,
          name: r.name,
          amount: netLiab.toFixed(2)
        });
      } else if (r.type === 'equity') {
        const netEq = c.minus(d);
        totalHistoricalEquity = totalHistoricalEquity.plus(netEq);
        equityItems.push({
          account_id: r.account_id,
          code: r.code,
          name: r.name,
          amount: netEq.toFixed(2)
        });
      } else if (r.type === 'revenue') {
        periodRevenue = periodRevenue.plus(c.minus(d));
      } else if (r.type === 'expense') {
        periodExpense = periodExpense.plus(d.minus(c));
      }
    }

    // Retained Earnings / Current Period Net Earnings
    const currentPeriodNetIncome = periodRevenue.minus(periodExpense);
    equityItems.push({
      account_id: 'retained-current-period',
      code: '3999',
      name: 'Current Period Net Earnings',
      amount: currentPeriodNetIncome.toFixed(2)
    });

    const totalEquity = totalHistoricalEquity.plus(currentPeriodNetIncome);
    const totalLiabilitiesAndEquity = totalLiabilities.plus(totalEquity);
    const difference = totalAssets.minus(totalLiabilitiesAndEquity).abs();
    const isBalanced = difference.lessThan('0.01');

    return {
      as_of_date: params.as_of_date || new Date().toISOString().split('T')[0],
      assets: {
        current_assets: currentAssets,
        fixed_assets: fixedAssets,
        total: totalAssets.toFixed(2)
      },
      liabilities: {
        current_liabilities: currentLiabilities,
        total: totalLiabilities.toFixed(2)
      },
      equity: {
        items: equityItems,
        total: totalEquity.toFixed(2)
      },
      total_liabilities_and_equity: totalLiabilitiesAndEquity.toFixed(2),
      is_balanced: isBalanced,
      variance: difference.toFixed(2)
    };
  }

  /**
   * Accounts Receivable (AR) Aging
   */
  static getARAging(organization_id: string) {
    const invoices = db.prepare(`
      SELECT 
        i.id,
        i.invoice_number,
        i.issue_date,
        i.due_date,
        i.total_amount,
        i.paid_amount,
        i.balance_due,
        c.id as client_id,
        c.name as client_name,
        c.company_name
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.organization_id = ? AND i.status IN ('sent', 'partially_paid', 'overdue')
      ORDER BY i.due_date ASC
    `).all(organization_id) as any[];

    const today = new Date();
    let bucketCurrent = new Decimal(0);
    let bucket30 = new Decimal(0);
    let bucket60 = new Decimal(0);
    let bucket90Plus = new Decimal(0);
    let totalOutstanding = new Decimal(0);

    const detailedInvoices = invoices.map(inv => {
      const balance = new Decimal(inv.balance_due);
      totalOutstanding = totalOutstanding.plus(balance);

      const dueDate = new Date(inv.due_date);
      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

      let ageBucket = 'Current';
      if (diffDays <= 0) {
        ageBucket = 'Current (Not Due)';
        bucketCurrent = bucketCurrent.plus(balance);
      } else if (diffDays <= 30) {
        ageBucket = '1 - 30 Days Overdue';
        bucket30 = bucket30.plus(balance);
      } else if (diffDays <= 60) {
        ageBucket = '31 - 60 Days Overdue';
        bucket60 = bucket60.plus(balance);
      } else {
        ageBucket = '61+ Days Overdue';
        bucket90Plus = bucket90Plus.plus(balance);
      }

      return {
        ...inv,
        days_overdue: Math.max(0, diffDays),
        age_bucket: ageBucket
      };
    });

    return {
      total_outstanding: totalOutstanding.toFixed(2),
      buckets: {
        current: bucketCurrent.toFixed(2),
        days_1_30: bucket30.toFixed(2),
        days_31_60: bucket60.toFixed(2),
        days_61_plus: bucket90Plus.toFixed(2)
      },
      invoices: detailedInvoices
    };
  }

  /**
   * Accounts Payable (AP) Aging
   */
  static getAPAging(organization_id: string) {
    const bills = db.prepare(`
      SELECT 
        b.id,
        b.bill_number,
        b.bill_date,
        b.due_date,
        b.total_amount,
        b.paid_amount,
        b.balance_due,
        v.id as vendor_id,
        v.name as vendor_name,
        v.company_name
      FROM bills b
      JOIN vendors v ON b.vendor_id = v.id
      WHERE b.organization_id = ? AND b.status IN ('approved', 'partially_paid')
      ORDER BY b.due_date ASC
    `).all(organization_id) as any[];

    const today = new Date();
    let bucketCurrent = new Decimal(0);
    let bucket30 = new Decimal(0);
    let bucket60 = new Decimal(0);
    let bucket90Plus = new Decimal(0);
    let totalPayables = new Decimal(0);

    const detailedBills = bills.map(bill => {
      const balance = new Decimal(bill.balance_due);
      totalPayables = totalPayables.plus(balance);

      const dueDate = new Date(bill.due_date);
      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

      let ageBucket = 'Current';
      if (diffDays <= 0) {
        ageBucket = 'Current (Not Due)';
        bucketCurrent = bucketCurrent.plus(balance);
      } else if (diffDays <= 30) {
        ageBucket = '1 - 30 Days Overdue';
        bucket30 = bucket30.plus(balance);
      } else if (diffDays <= 60) {
        ageBucket = '31 - 60 Days Overdue';
        bucket60 = bucket60.plus(balance);
      } else {
        ageBucket = '61+ Days Overdue';
        bucket90Plus = bucket90Plus.plus(balance);
      }

      return {
        ...bill,
        days_overdue: Math.max(0, diffDays),
        age_bucket: ageBucket
      };
    });

    return {
      total_payables: totalPayables.toFixed(2),
      buckets: {
        current: bucketCurrent.toFixed(2),
        days_1_30: bucket30.toFixed(2),
        days_31_60: bucket60.toFixed(2),
        days_61_plus: bucket90Plus.toFixed(2)
      },
      bills: detailedBills
    };
  }

  /**
   * Cash Flow Statement (Direct method based on cash/bank transactions)
   */
  static getCashFlowStatement(organization_id: string) {
    const cashAccounts = db.prepare(`
      SELECT id FROM chart_of_accounts
      WHERE organization_id = ? AND sub_type = 'cash_and_bank'
    `).all(organization_id) as { id: string }[];

    const cashAccountIds = cashAccounts.map(a => a.id);
    if (cashAccountIds.length === 0) {
      return {
        operating_cash_flow: '0.00',
        investing_cash_flow: '0.00',
        financing_cash_flow: '0.00',
        net_cash_change: '0.00',
        closing_cash: '0.00'
      };
    }

    const placeholders = cashAccountIds.map(() => '?').join(',');
    const cashLines = db.prepare(`
      SELECT 
        l.debit,
        l.credit,
        j.source_type,
        j.memo,
        j.posting_date
      FROM journal_lines l
      JOIN journal_entries j ON l.journal_entry_id = j.id AND j.status = 'posted'
      WHERE j.organization_id = ? AND l.account_id IN (${placeholders})
    `).all(organization_id, ...cashAccountIds) as any[];

    let operatingInflow = new Decimal(0);
    let operatingOutflow = new Decimal(0);
    let investingOutflow = new Decimal(0);
    let financingInflow = new Decimal(0);
    let financingOutflow = new Decimal(0);

    for (const line of cashLines) {
      const d = new Decimal(line.debit); // Cash received
      const c = new Decimal(line.credit); // Cash spent

      if (line.source_type === 'payment' || line.source_type === 'pos_integration') {
        operatingInflow = operatingInflow.plus(d);
      } else if (line.source_type === 'bill_payment' || line.source_type === 'payroll') {
        operatingOutflow = operatingOutflow.plus(c);
      } else if (line.source_type === 'partner_equity') {
        if (d.greaterThan(0)) {
          financingInflow = financingInflow.plus(d);
        } else {
          financingOutflow = financingOutflow.plus(c);
        }
      } else if (line.source_type === 'opening_balance') {
        financingInflow = financingInflow.plus(d);
      } else {
        if (d.greaterThan(0)) operatingInflow = operatingInflow.plus(d);
        if (c.greaterThan(0)) operatingOutflow = operatingOutflow.plus(c);
      }
    }

    const netOperating = operatingInflow.minus(operatingOutflow);
    const netInvesting = new Decimal(0).minus(investingOutflow);
    const netFinancing = financingInflow.minus(financingOutflow);
    const netCashChange = netOperating.plus(netInvesting).plus(netFinancing);

    return {
      operating: {
        inflows: operatingInflow.toFixed(2),
        outflows: operatingOutflow.toFixed(2),
        net: netOperating.toFixed(2)
      },
      investing: {
        outflows: investingOutflow.toFixed(2),
        net: netInvesting.toFixed(2)
      },
      financing: {
        inflows: financingInflow.toFixed(2),
        outflows: financingOutflow.toFixed(2),
        net: netFinancing.toFixed(2)
      },
      net_cash_change: netCashChange.toFixed(2)
    };
  }
}
