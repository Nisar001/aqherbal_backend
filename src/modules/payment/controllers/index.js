import { PaymentService } from '../../../services/payment.service.js';
import { validateInitiatePayment } from '../../../validations/payment.validation.js';
import { response } from '../../../helpers/response.helper.js';

export const initiatePayment = async (req, res, next) => {
  try {
    const { error, value } = validateInitiatePayment(req.body);
    if (error) {
      return response(res, 400, 'Validation error', null, error.details);
    }

    const paymentIntent = await PaymentService.initiatePayment(
      req.user.id,
      value.orderId,
      value.method
    );
    response(res, 200, 'Payment initiated', paymentIntent);
  } catch (err) {
    next(err);
  }
};

export const handleStripeWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    const event = await PaymentService.verifyStripeWebhook(
      signature,
      req.rawBody || req.body,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'payment_intent.succeeded') {
      const paymentId = event.data.object.metadata.paymentId;
      await PaymentService.handlePaymentSuccess(paymentId, event.data.object.id);
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentId = event.data.object.metadata.paymentId;
      await PaymentService.handlePaymentFailure(paymentId, event.data.object.last_payment_error?.message);
    }

    response(res, 200, 'Webhook processed', { received: true });
  } catch (err) {
    next(err);
  }
};

export const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const { event, payload } = req.body;
    const signature = req.headers['x-razorpay-signature'];
    await PaymentService.verifyRazorpayWebhook(signature, req.rawBody || req.body, process.env.RAZORPAY_WEBHOOK_SECRET);

    switch (event) {
    case 'payment.authorized': {
      await PaymentService.captureRazorpayPayment(
        payload.payment.entity.id
      );
      await PaymentService.handlePaymentSuccess(
        payload.payment.entity.metadata?.paymentId,
        payload.payment.entity.id
      );
      break;
    }

    case 'payment.captured':
      await PaymentService.handlePaymentSuccess(
        payload.payment.entity.metadata?.paymentId,
        payload.payment.entity.id
      );
      break;

    case 'payment.failed':
      await PaymentService.handlePaymentFailure(
        payload.payment.entity.metadata?.paymentId,
        payload.payment.entity.error_reason || 'Payment failed'
      );
      break;

    default:
      console.info(`Unhandled Razorpay event: ${event}`);
    }

    response(res, 200, 'Webhook processed', { received: true });
  } catch (err) {
    next(err);
  }
};

export const getPaymentHistory = async (req, res, next) => {
  try {
    const { calculatePagination, buildPaginationMeta } = await import('../../../helpers/pagination.helper.js');
    const { page, limit } = calculatePagination(req.query, 10, 50);

    const result = await PaymentService.getPaymentHistory(req.user.id, page, limit);
    const pagination = buildPaginationMeta(result.total, page, limit);
    response(res, 200, 'Payment history retrieved', { payments: result.payments, pagination });
  } catch (err) {
    next(err);
  }
};

export const retryPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const paymentIntent = await PaymentService.retryPayment(id, req.user.id);
    response(res, 200, 'Payment retry initiated', paymentIntent);
  } catch (err) {
    next(err);
  }
};

// Admin only
export const getFailedPayments = async (req, res, next) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const payments = await PaymentService.getFailedPayments(hours);
    response(res, 200, `Failed payments (last ${hours} hours)`, payments);
  } catch (err) {
    next(err);
  }
};
