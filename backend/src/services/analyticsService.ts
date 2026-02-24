import db from '../database';

export class AnalyticsService {
  async getUserStats() {
    const totalUsersRow = await db('users').count('id as count').first();
    const verifiedUsersRow = await db('users').whereNotNull('email_verified_at').count('id as count').first();

    // signups per day (last 30 days)
    const signupsPerDay = await db('users')
      .select(db.raw("to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day"))
      .count('* as count')
      .where('created_at', '>=', db.raw(`now() - interval '30 days'`))
      .groupByRaw("date_trunc('day', created_at)")
      .orderBy('day', 'asc');

    return {
      totalUsers: Number(totalUsersRow?.count || 0),
      verifiedUsers: Number(verifiedUsersRow?.count || 0),
      signupsPerDay,
    };
  }

  async getSearchStats() {
    const totalSearchesRow = await db('search_events').count('id as count').first();
    const recentSearches = await db({ se: 'search_events' })
      .leftJoin({ ss: 'scraping_sessions' }, 'se.session_id', 'ss.id')
      .select(
        'se.id',
        'se.user_id',
        'se.session_id',
        'se.url',
        'se.domain',
        'se.created_at',
        db.raw('coalesce(ss.is_trial, false) as is_trial'),
        db.raw('"ss"."packId" as session_name')
      )
      .orderBy('se.created_at', 'desc')
      .limit(50);

    return {
      totalSearches: Number(totalSearchesRow?.count || 0),
      recentSearches,
    };
  }

  async getSessionTimeseries() {
    // sessions per day (last 30 days)
    const sessionsPerDay = await db('scraping_sessions')
      .select(db.raw("to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day"))
      .count('* as count')
      .where('created_at', '>=', db.raw(`now() - interval '30 days'`))
      .groupByRaw("date_trunc('day', created_at)")
      .orderBy('day', 'asc');

    const paidPerDay = await db('scraping_sessions')
      .select(db.raw("to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day"))
      .count('* as count')
      .where('isPaid', true)
      .andWhere('created_at', '>=', db.raw(`now() - interval '30 days'`))
      .groupByRaw("date_trunc('day', created_at)")
      .orderBy('day', 'asc');

    return { sessionsPerDay, paidPerDay };
  }

  async getPaymentStats() {
    const totalPaymentsRow = await db('scraping_sessions').where('isPaid', true).count('* as count').first();
    return { totalPayments: Number(totalPaymentsRow?.count || 0) };
  }

  async getSearchEventsPaginated(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [rows, totalRow] = await Promise.all([
      db({ se: 'search_events' })
        .leftJoin({ ss: 'scraping_sessions' }, 'se.session_id', 'ss.id')
        .select(
          'se.id',
          'se.user_id',
          'se.session_id',
          'se.url',
          'se.domain',
          'se.created_at',
          db.raw('coalesce(ss.is_trial, false) as is_trial'),
          db.raw('"ss"."packId" as session_name')
        )
        .orderBy('se.created_at', 'desc')
        .limit(limit)
        .offset(offset),
      db('search_events').count('* as count').first(),
    ]);
    return {
      items: rows,
      total: Number(totalRow?.count || 0),
      page,
      limit,
      pages: Math.ceil(Number(totalRow?.count || 0) / limit) || 1,
    };
  }

  async getSearchEventsPaginatedFiltered(params: { page?: number; limit?: number; from?: string; to?: string; userId?: number | null }) {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(1000, Math.max(1, Number(params.limit || 50)));
    const offset = (page - 1) * limit;
    const q = db({ se: 'search_events' })
      .leftJoin({ u: 'users' }, 'se.user_id', 'u.id')
      .leftJoin({ ss: 'scraping_sessions' }, 'se.session_id', 'ss.id')
      .select(
        'se.id',
        'se.user_id',
        'se.session_id',
        'se.url',
        'se.domain',
        'se.status',
        'se.duration_ms',
        'se.error_code',
        'se.created_at',
        db.raw('u.email as user_email'),
        db.raw('"ss"."packId" as session_name'),
        db.raw('"ss"."downloadUrl" as download_url'),
        db.raw('coalesce(ss.is_trial, false) as is_trial')
      )
      .orderBy('se.created_at', 'desc');
    const qc = db({ se: 'search_events' })
      .leftJoin({ u: 'users' }, 'se.user_id', 'u.id')
      .leftJoin({ ss: 'scraping_sessions' }, 'se.session_id', 'ss.id')
      .count<{ count: number }[]>({ count: '*' });
    if (params.from) {
      q.where('se.created_at', '>=', params.from);
      qc.where('se.created_at', '>=', params.from);
    }
    if (params.to) {
      q.andWhere('se.created_at', '<=', params.to);
      qc.andWhere('se.created_at', '<=', params.to);
    }
    if (typeof params.userId === 'number') {
      q.andWhere('se.user_id', params.userId);
      qc.andWhere('se.user_id', params.userId);
    }
    const [items, totalRow] = await Promise.all([q.limit(limit).offset(offset), qc.first()]);
    return {
      items,
      total: Number((totalRow as any)?.count || 0),
      page,
      limit,
      pages: Math.ceil(Number((totalRow as any)?.count || 0) / limit) || 1,
    };
  }

  // Advanced KPIs
  async getActiveUsersCounts() {
    const [dau, wau, mau] = await Promise.all([
      db('search_events').countDistinct('user_id as c').whereNotNull('user_id').andWhere('created_at', '>=', db.raw(`now() - interval '1 day'`)).first(),
      db('search_events').countDistinct('user_id as c').whereNotNull('user_id').andWhere('created_at', '>=', db.raw(`now() - interval '7 days'`)).first(),
      db('search_events').countDistinct('user_id as c').whereNotNull('user_id').andWhere('created_at', '>=', db.raw(`now() - interval '30 days'`)).first(),
    ]);
    return { dau: Number(dau?.c || 0), wau: Number(wau?.c || 0), mau: Number(mau?.c || 0) };
  }

  async getVerificationRate() {
    const [total, verified] = await Promise.all([
      db('users').count('* as c').first(),
      db('users').whereNotNull('email_verified_at').count('* as c').first(),
    ]);
    return { total: Number(total?.c || 0), verified: Number(verified?.c || 0), rate: (Number(verified?.c || 0) / Math.max(1, Number(total?.c || 0))) };
  }

  async getSignupToFirstSearchConversion() {
    // users with at least one search
    const usersWithSearch = await db('search_events').distinct('user_id').whereNotNull('user_id');
    const ids = usersWithSearch.map((r: any) => r.user_id);
    const totalUsersRow = await db('users').count('* as c').first();
    const convRate = ids.length / Math.max(1, Number(totalUsersRow?.c || 0));
    // median delay between user.created_at and first search
    const firstSearches = await db
      .select('u.id as user_id', 'u.created_at as signup', db.raw('min(se.created_at) as first_search'))
      .from({ u: 'users' })
      .leftJoin({ se: 'search_events' }, 'u.id', 'se.user_id')
      .whereIn('u.id', ids.length ? ids : [-1])
      .groupBy('u.id', 'u.created_at');
    const delays = firstSearches
      .filter((r: any) => r.first_search && r.signup)
      .map((r: any) => (new Date(r.first_search).getTime() - new Date(r.signup).getTime()))
      .sort((a: number, b: number) => a - b);
    const medianDelayMs = delays.length ? delays[Math.floor(delays.length / 2)] : null;
    return { conversionRate: convRate, medianDelayMs };
  }

  async getSearchesPerDayWithMA() {
    const rows = await db('search_events')
      .select(db.raw("to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day"))
      .count('* as count')
      .where('created_at', '>=', db.raw(`now() - interval '30 days'`))
      .groupByRaw("date_trunc('day', created_at)")
      .orderBy('day', 'asc');
    // compute 7-day moving average in code
    const series = rows.map((r: any) => ({ day: r.day, count: Number(r.count) }));
    const withMA = series.map((_, i) => {
      const start = Math.max(0, i - 6);
      const slice = series.slice(start, i + 1);
      const ma = slice.reduce((s, x) => s + x.count, 0) / slice.length;
      return { ...series[i], ma7: Math.round(ma * 100) / 100 };
    });
    return withMA;
  }

  async getPerUserSearchDistribution() {
    const perUser = await db('search_events')
      .select('user_id')
      .whereNotNull('user_id')
      .count('* as c')
      .groupBy('user_id');
    const counts = perUser.map((r: any) => Number(r.c)).sort((a: number, b: number) => a - b);
    const percentile = (p: number) => counts.length ? counts[Math.min(counts.length - 1, Math.floor(p * counts.length))] : 0;
    return {
      median: percentile(0.5),
      p90: percentile(0.9),
      p99: percentile(0.99),
    };
  }

  async getFailureAndLatency() {
    const totalRow = await db('search_events').count('* as c').first();
    const failedRow = await db('search_events').where('status', 'FAILED').count('* as c').first();
    const rate = Number(failedRow?.c || 0) / Math.max(1, Number(totalRow?.c || 0));
    const percentiles = await db
      .select(
        db.raw("percentile_cont(0.5) within group (order by duration_ms) as p50"),
        db.raw("percentile_cont(0.95) within group (order by duration_ms) as p95"),
        db.raw("percentile_cont(0.99) within group (order by duration_ms) as p99")
      )
      .from('search_events')
      .whereNotNull('duration_ms')
      .first();
    return {
      failureRate: rate,
      latencyMs: {
        p50: Number((percentiles as any)?.p50 || 0),
        p95: Number((percentiles as any)?.p95 || 0),
        p99: Number((percentiles as any)?.p99 || 0),
      },
    };
  }

  async getSearchToPaymentConversion() {
    const totalSessionsRow = await db('scraping_sessions').count('* as c').first();
    const paidRow = await db('scraping_sessions').where('isPaid', true).count('* as c').first();
    return { conversionRate: Number(paidRow?.c || 0) / Math.max(1, Number(totalSessionsRow?.c || 0)) };
  }

  async getPaymentsTimeseriesAndBreakdown() {
    const paymentsPerDay = await db('scraping_sessions')
      .select(db.raw("to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day"))
      .count('* as count')
      .where('isPaid', true)
      .andWhere('created_at', '>=', db.raw(`now() - interval '30 days'`))
      .groupByRaw("date_trunc('day', created_at)")
      .orderBy('day', 'asc');
    let methodBreakdown: any[] = [];
    try {
      methodBreakdown = await db('scraping_sessions')
        .select('payment_method')
        .count('* as count')
        .where('isPaid', true)
        .groupBy('payment_method')
        .orderBy('count', 'desc');
    } catch {}
    return { paymentsPerDay, methodBreakdown };
  }

  async getVerificationWithin24hRate() {
    const totalRow = await db('users').count('* as c').first();
    const rows = await db('users')
      .select('created_at', 'email_verified_at')
      .whereNotNull('email_verified_at');
    const within = rows.filter((r: any) => (new Date(r.email_verified_at).getTime() - new Date(r.created_at).getTime()) <= 24 * 3600 * 1000).length;
    return { rate: within / Math.max(1, Number(totalRow?.c || 0)) };
  }

  async getRetentionCohorts() {
    // Simplified: last 8 weeks cohorts with next-week retention based on any search
    const cohorts = await db
      .select(db.raw("to_char(date_trunc('week', created_at), 'IYYY-IW') as week"))
      .count('* as signups')
      .from('users')
      .where('created_at', '>=', db.raw(`now() - interval '56 days'`))
      .groupByRaw("date_trunc('week', created_at)")
      .orderBy('week', 'asc');
    const results: any[] = [];
    for (const c of cohorts as any[]) {
      const week = c.week;
      // Users that belong to this ISO week string
      const usersInWeek = await db('users')
        .select('id', 'created_at')
        .whereRaw("to_char(date_trunc('week', created_at), 'IYYY-IW') = ?", [week]);
      const ids = usersInWeek.map((u: any) => u.id);
      let retained = 0;
      if (ids.length) {
        // Compute start of week based on min created_at among users in the cohort
        const minCreated = usersInWeek.reduce((min: number, u: any) => Math.min(min, new Date(u.created_at).getTime()), Infinity);
        const start = new Date(minCreated);
        // Set to start of ISO week (Monday)
        const dow = start.getDay(); // 0=Sun,1=Mon,...
        const diffToMonday = ((dow + 6) % 7); // days since Monday
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - diffToMonday);
        const nextWeekStart = new Date(start);
        nextWeekStart.setDate(nextWeekStart.getDate() + 7);
        const nextWeekEnd = new Date(start);
        nextWeekEnd.setDate(nextWeekEnd.getDate() + 14);

        const nextWeekSearchers = await db('search_events')
          .distinct('user_id')
          .whereIn('user_id', ids)
          .andWhere('created_at', '>=', nextWeekStart)
          .andWhere('created_at', '<', nextWeekEnd);
        retained = nextWeekSearchers.length;
      }
      results.push({ week, signups: Number(c.signups), retainedNextWeek: retained, rate: Number(c.signups) ? retained / Number(c.signups) : 0 });
    }
    return results;
  }
  async getBusinessSectorDistribution() {
    const rows = await db('users')
      .select('business_sector as sector')
      .count('* as count')
      .whereNotNull('business_sector')
      .groupBy('business_sector')
      .orderBy('count', 'desc');
    return rows.map((r: any) => ({ sector: r.sector, count: Number(r.count) }));
  }

  async getCompanySizeDistribution() {
    const rows = await db('users')
      .select('company_size as size')
      .count('* as count')
      .whereNotNull('company_size')
      .groupBy('company_size')
      .orderBy('count', 'desc');
    return rows.map((r: any) => ({ size: r.size, count: Number(r.count) }));
  }
}

export const analyticsService = new AnalyticsService();
