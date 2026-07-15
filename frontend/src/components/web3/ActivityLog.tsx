'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { shortenAddress } from '@/lib/utils';

type ActivityStatus = 'pending' | 'success' | 'error';
type ActivityType = 'approve' | 'deposit' | 'withdraw';

export interface Activity {
  id: string;
  type: ActivityType;
  status: ActivityStatus;
  amount?: string;
  message?: string;
  txHash?: string;
  timestamp: number;
}

interface ActivityContextValue {
  activities: Activity[];
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => string;
  updateActivity: (id: string, updates: Partial<Omit<Activity, 'id' | 'timestamp'>>) => void;
  removeActivity: (id: string) => void;
  clearActivities: () => void;
}

const ActivityContext = createContext<ActivityContextValue>({
  activities: [],
  addActivity: () => '',
  updateActivity: () => {},
  removeActivity: () => {},
  clearActivities: () => {},
});

export function useActivity() {
  return useContext(ActivityContext);
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([]);

  const MAX_ACTIVITIES = 3;

  const addActivity = useCallback((activity: Omit<Activity, 'id' | 'timestamp'>) => {
    const id = generateId();
    setActivities((prev) => {
      const next = [{ ...activity, id, timestamp: Date.now() }, ...prev];
      return next.slice(0, MAX_ACTIVITIES);
    });
    return id;
  }, []);

  const updateActivity = useCallback(
    (id: string, updates: Partial<Omit<Activity, 'id' | 'timestamp'>>) => {
      setActivities((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
    },
    []
  );

  const removeActivity = useCallback((id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  const value = useMemo(
    () => ({ activities, addActivity, updateActivity, removeActivity, clearActivities }),
    [activities, addActivity, updateActivity, removeActivity, clearActivities]
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

function activityTitle(type: ActivityType, amount?: string) {
  const label = {
    approve: 'Approve allowance',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
  }[type];
  return amount ? `${label} ${amount} MTK` : label;
}

function statusStamp(status: ActivityStatus) {
  switch (status) {
    case 'success':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[var(--ink-green-bg)] text-[var(--ink-green)] border border-[var(--ink-green)]/10">
          Paid
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[var(--seal-red-bg)] text-[var(--seal-red)] border border-[var(--seal-red)]/10">
          Rejected
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-stone-100 text-stone-500 border border-stone-200">
          Pending
        </span>
      );
  }
}

function statusIcon(status: ActivityStatus) {
  if (status === 'success') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  if (status === 'error') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  }
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function Receipt({ activity, onDismiss }: { activity: Activity; onDismiss: () => void }) {
  const isError = activity.status === 'error';
  const isSuccess = activity.status === 'success';

  return (
    <div
      className={`receipt relative bg-[var(--paper)] border border-[var(--border)] rounded-sm p-3 shadow-sm ${
        isError ? 'receipt-error' : isSuccess ? 'receipt-success' : 'receipt-pending'
      }`}
    >
      {/* Perforated top edge */}
      <div className="receipt-edge receipt-edge-top" aria-hidden="true" />

      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`shrink-0 ${
              isError ? 'text-[var(--seal-red)]' : isSuccess ? 'text-[var(--ink-green)]' : 'text-stone-400'
            }`}
          >
            {statusIcon(activity.status)}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium text-[var(--ink)] truncate leading-tight">
              {activityTitle(activity.type, activity.amount)}
            </div>
            <div className="text-[10px] text-[var(--ink-muted)] mt-0.5 font-mono">{formatTime(activity.timestamp)}</div>
          </div>
        </div>
        {statusStamp(activity.status)}
      </div>

      {activity.message && (
        <div
          className={`text-xs leading-relaxed break-words px-2 py-1.5 rounded border ${
            isError
              ? 'bg-[var(--seal-red-bg)] text-[var(--seal-red)] border-[var(--seal-red)]/10'
              : isSuccess
              ? 'bg-[var(--ink-green-bg)] text-[var(--ink-green)] border-[var(--ink-green)]/10'
              : 'bg-stone-100 text-stone-600 border-stone-200'
          }`}
        >
          {activity.message}
        </div>
      )}

      {activity.txHash && (
        <a
          href={`https://etherscan.io/tx/${activity.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-[10px] font-mono text-[var(--ink-muted)] hover:text-[var(--copper)] transition-colors"
        >
          {shortenAddress(activity.txHash)}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <path d="M15 3h6v6" />
            <path d="M10 14L21 3" />
          </svg>
        </a>
      )}

      <button
        onClick={onDismiss}
        className="absolute top-1.5 right-1.5 p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] rounded-full hover:bg-stone-100 transition-colors"
        aria-label="Dismiss receipt"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function ActivityLog() {
  const { activities, removeActivity, clearActivities } = useActivity();

  if (activities.length === 0) {
    return (
      <aside className="activity-log">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ink)]">Receipts</h2>
        </div>
        <div className="text-sm text-[var(--ink-muted)] italic border-2 border-dashed border-[var(--border)] rounded-sm p-6 text-center">
          No transactions yet. Your activity will be printed here.
        </div>
      </aside>
    );
  }

  return (
    <aside className="activity-log">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ink)]">Receipts</h2>
        <button
          onClick={clearActivities}
          className="text-xs text-[var(--ink-muted)] hover:text-[var(--seal-red)] transition-colors"
        >
          Clear all
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {activities.map((activity) => (
          <Receipt key={activity.id} activity={activity} onDismiss={() => removeActivity(activity.id)} />
        ))}
      </div>
    </aside>
  );
}
