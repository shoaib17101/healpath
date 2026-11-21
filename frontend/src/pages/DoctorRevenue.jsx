import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, DollarSign, TrendingUp } from 'lucide-react'
import API from '../api'
import DashboardShell from '../components/DashboardShell'

const emptyTotals = {
  grossRevenue: 0,
  commission: 0,
  doctorEarnings: 0,
  paidOut: 0,
  pendingPayout: 0,
}

const formatCurrency = (value) => `PKR ${Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`

export default function DoctorRevenue() {
  const [totals, setTotals] = useState(emptyTotals)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const response = await API.get('/doctor-revenue')
        setTotals({ ...emptyTotals, ...response.data.totals })
        setPayments(response.data.payments || [])
      } catch (err) {
        console.error(err)
        setMessage(err.response?.data?.msg || 'Unable to load revenue data.')
      } finally {
        setLoading(false)
      }
    }

    fetchRevenue()
  }, [])

  const summaryCards = [
    { label: 'Gross Revenue', value: totals.grossRevenue, icon: TrendingUp, iconClass: 'bg-sky-50 text-sky-600' },
    { label: 'Your Earnings', value: totals.doctorEarnings, icon: DollarSign, iconClass: 'bg-emerald-50 text-emerald-600' },
    { label: 'Paid Out', value: totals.paidOut, icon: CheckCircle2, iconClass: 'bg-teal-50 text-teal-600' },
    { label: 'Pending Payout', value: totals.pendingPayout, icon: Clock3, iconClass: 'bg-amber-50 text-amber-600' },
  ]

  return (
    <DashboardShell
      title="Doctor Revenue"
      subtitle="Track revenue generated from your completed consultations."
    >
      {loading ? (
        <div className="rounded-[2rem] bg-white border border-slate-200 p-12 text-center text-slate-500">
          Loading revenue data...
        </div>
      ) : (
        <div className="space-y-6">
          {message && (
            <div className="rounded-3xl bg-rose-50 border border-rose-100 px-5 py-4 text-sm text-rose-700">
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {summaryCards.map(({ label, value, icon: Icon, iconClass }) => (
              <div key={label} className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                  <div className={`rounded-2xl p-2.5 ${iconClass}`}>
                    <Icon size={19} />
                  </div>
                </div>
                <p className="mt-4 text-2xl font-black text-slate-900">{formatCurrency(value)}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[2rem] bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-400 font-semibold">Completed Payments</p>
              <h2 className="text-2xl font-black text-slate-900">Revenue History</h2>
            </div>
            {payments.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">No completed payments yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Patient</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Date</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Gross</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Your Share</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((payment) => (
                      <tr key={payment._id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">{payment.patientName}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">{formatCurrency(payment.amount)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-emerald-700">{formatCurrency(payment.doctorPayoutAmount)}</td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${payment.payoutStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {payment.payoutStatus || 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
