export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: 'INR';
  name: string;
  description: string;
  order_id: string;
  callback_url?: string;
  redirect?: boolean;
  handler: (response: RazorpaySuccess) => void;
  prefill?: { name?: string; contact?: string };
  theme?: { color: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay checkout could not load'));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(options: Omit<RazorpayCheckoutOptions, 'handler' | 'modal'>): Promise<RazorpaySuccess> {
  await loadRazorpay();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error('Razorpay checkout could not load');
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error, response?: RazorpaySuccess) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else if (response) resolve(response);
    };
    const checkout = new Razorpay({
      ...options,
      handler: (response) => finish(undefined, response),
      modal: { ondismiss: () => finish(new Error('Payment was cancelled')) },
    });
    checkout.on('payment.failed', (response) => {
      finish(new Error(response.error?.description || 'Payment failed'));
    });
    checkout.open();
  });
}
