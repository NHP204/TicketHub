// Interface cổng thanh toán. File này chỉ mô tả hợp đồng, không có code chạy.
// Thêm cổng mới (VNPay, ...) = viết một lớp mới thỏa interface này và nối trong container.js;
// PaymentService không phải sửa.

/**
 * @typedef {object} ChargeResult
 * @property {boolean} success - true khi trừ tiền thành công.
 * @property {string} transactionRef - mã giao dịch phía cổng thanh toán (duy nhất).
 * @property {string} [reason] - lý do thất bại, ví dụ 'DECLINED'.
 */

/**
 * @typedef {object} PaymentProvider
 * @property {string} name - tên cổng, lưu vào cột payments.provider (ví dụ 'MOCK').
 * @property {(input: { bookingId: string, amount: number }) => Promise<ChargeResult>} charge
 *   Trừ amount (số nguyên đồng) cho booking. Thất bại nghiệp vụ trả success: false, không ném lỗi.
 */

export {};
