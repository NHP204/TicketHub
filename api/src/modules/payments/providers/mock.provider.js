import { randomUUID } from 'node:crypto';

// Cổng thanh toán giả lập, thỏa interface PaymentProvider (xem payment-provider.js).
// shouldFail() trả true → giao dịch bị từ chối.
export class MockPaymentProvider {
  constructor({ shouldFail = () => false } = {}) {
    this.name = 'MOCK';
    this.shouldFail = shouldFail;
  }

  async charge() {
    const transactionRef = `MOCK-${randomUUID()}`;
    if (this.shouldFail()) return { success: false, transactionRef, reason: 'DECLINED' };
    return { success: true, transactionRef };
  }
}
