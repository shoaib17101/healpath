import React from 'react'
import html2pdf from 'html2pdf.js'

export default function PrescriptionView({
  patient = {},
  doctor = {},
  notes = [],
  medicines = [],
}) {
  const items = notes.length ? notes : medicines

  const {
    name: patientName = 'Patient Name',
    age = '35 yrs',
    weight = '70 kg',
    bp = '120/80',
    pulse = '72 bpm',
  } = patient

  const {
    doctorName = 'Dr. Ayesha Khan',
    specialization = 'General Medicine',
    clinic = 'BKUC Medical Center',
    phone = '+92 300 1234567',
    date = new Date().toLocaleDateString(),
  } = doctor

  const handleDownloadPdf = () => {
    const element = document.getElementById('prescription-pad')
    if (!element) return

    const options = {
      margin: 10,
      filename: 'prescription.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }

    html2pdf().set(options).from(element).save()
  }

  return (
    <article className="mx-auto max-w-5xl p-4 sm:p-6">
      <div id="prescription-pad" className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fffcf2] shadow-[0_28px_80px_-40px_rgba(0,0,0,0.18)]">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 sm:px-8 sm:py-6">
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex print:hidden items-center justify-center rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              Download PDF
            </button>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Prescription</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">{doctorName}</h1>
              <p className="mt-1 text-base text-slate-600">{specialization}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{clinic}</p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-slate-600">
              <div className="rounded-3xl bg-white px-4 py-3 shadow-sm border border-slate-200">
                <p className="font-semibold text-slate-800">Phone</p>
                <p>{phone}</p>
              </div>
              <div className="rounded-3xl bg-white px-4 py-3 shadow-sm border border-slate-200">
                <p className="font-semibold text-slate-800">Date</p>
                <p>{date}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] p-6 sm:p-8">
          <aside className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 mb-5">Patient Vitals</h2>
            <div className="space-y-4">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Name</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{patientName}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Age</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{age}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Weight</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{weight}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">BP</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{bp}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pulse</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{pulse}</p>
              </div>
            </div>
          </aside>

          <section className="relative rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 right-0 -mr-16 flex items-center opacity-10">
              <span className="text-[12rem] font-black leading-none text-slate-200">Rx</span>
            </div>
            <div className="relative z-10">
              <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Patient</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{patientName}</p>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {clinic}
                </div>
              </div>

              <div className="space-y-4 rounded-3xl border border-slate-200 bg-[#fff7ed] p-6 font-["Dancing_Script",cursive] text-lg leading-9 text-slate-900">
                {items.length > 0 ? (
                  <ol className="space-y-3 list-outside list-decimal pl-5">
                    {items.map((item, index) => (
                      <li key={index} className="break-words">{item}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-slate-500">Prescribe medicines or notes here to fill the prescription pad.</p>
                )}
              </div>

              <div className="mt-10 flex justify-between items-end gap-4">
                <div className="max-w-xs text-sm text-slate-500">
                  <p className="font-semibold text-slate-700">Instructions</p>
                  <p className="mt-2">Take medicines as directed and return for follow-up in 7 days.</p>
                </div>
                <div className="text-right">
                  <div className="mb-3 h-0.5 w-48 bg-slate-300" />
                  <p className="text-sm font-semibold text-slate-900">{doctorName}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Dr's Signature</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </article>
  )
}
