function calculatePaymentSplit({ amount, commissionPercent }) {
  const grossAmount = Number(amount) || 0;
  const normalizedPercent = Math.max(0, Math.min(100, Number(commissionPercent) || 0));
  const commissionAmount = Number((grossAmount * normalizedPercent / 100).toFixed(2));
  const doctorPayoutAmount = Number((grossAmount - commissionAmount).toFixed(2));

  return {
    grossAmount,
    commissionPercent: normalizedPercent,
    commissionAmount,
    doctorPayoutAmount,
    adminShare: commissionAmount,
    doctorShare: doctorPayoutAmount,
  };
}

module.exports = {
  calculatePaymentSplit,
};
