import { NextRequest, NextResponse } from 'next/server';
import {
  createOrderWithReservation,
  attachRazorpayOrderId,
  getCustomerByEmail,
  createCustomer,
  authenticateCustomer,
  updateCustomerProfile,
} from '@/lib/db/service';
import { createRazorpayOrder } from '@/lib/payments/razorpay';
import { getCustomerFromRequest, createCustomerToken, COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/customer';
import { sendCustomerWelcomeEmail } from '@/lib/notifications/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      customer_name,
      customer_email,
      customer_phone,
      customer_password,
      shipping_address_line1,
      shipping_address_line2,
      shipping_city,
      shipping_state,
      shipping_postal_code,
      shipping_country,
      items,
      notes,
    } = body;

    // Strict validation
    if (!customer_name || !customer_name.trim()) {
      return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
    }
    if (!customer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email.trim())) {
      return NextResponse.json({ success: false, error: 'Valid email address is required' }, { status: 400 });
    }
    if (!customer_phone || customer_phone.trim().length < 10) {
      return NextResponse.json({ success: false, error: 'Valid 10-digit phone number is required' }, { status: 400 });
    }
    if (!shipping_address_line1 || !shipping_address_line1.trim()) {
      return NextResponse.json({ success: false, error: 'Address line 1 is required' }, { status: 400 });
    }
    if (!shipping_city || !shipping_city.trim()) {
      return NextResponse.json({ success: false, error: 'City is required' }, { status: 400 });
    }
    if (!shipping_state || !shipping_state.trim()) {
      return NextResponse.json({ success: false, error: 'State is required' }, { status: 400 });
    }
    if (!shipping_postal_code || !/^\d{6}$/.test(shipping_postal_code.trim())) {
      return NextResponse.json({ success: false, error: 'Valid 6-digit PIN code is required' }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one item must be in the cart' }, { status: 400 });
    }

    // MANDATORY PERSISTENT CUSTOMER ACCOUNT LOGIC:
    // Every order must be tied to a permanent customer account.
    let customer = await getCustomerFromRequest(req);
    let sessionTokenToSet: string | null = null;

    const normalizedEmail = customer_email.trim().toLowerCase();

    if (!customer) {
      const existingCustomer = await getCustomerByEmail(normalizedEmail);
      if (existingCustomer) {
        // Customer exists: require password to authenticate and link order
        if (!customer_password) {
          return NextResponse.json(
            {
              success: false,
              requiresLogin: true,
              error: 'An account with this email already exists. Please enter your account password to verify and proceed.',
            },
            { status: 401 }
          );
        }
        const authenticated = await authenticateCustomer(normalizedEmail, customer_password);
        if (!authenticated) {
          return NextResponse.json(
            { success: false, error: 'Incorrect password for this account. Please try again or log in first.' },
            { status: 401 }
          );
        }
        customer = authenticated;
        sessionTokenToSet = createCustomerToken(customer.id);
      } else {
        // New Customer: Create persistent account forever
        if (!customer_password || customer_password.length < 6) {
          return NextResponse.json(
            {
              success: false,
              error: 'Please create an account password (min 6 characters) so you can track your order and download invoices anytime.',
            },
            { status: 400 }
          );
        }
        customer = await createCustomer({
          name: customer_name,
          email: normalizedEmail,
          phone: customer_phone,
          password: customer_password,
          address_line1: shipping_address_line1,
          address_line2: shipping_address_line2,
          city: shipping_city,
          state: shipping_state,
          postal_code: shipping_postal_code,
          country: shipping_country || 'India',
        });
        sessionTokenToSet = createCustomerToken(customer.id);
        sendCustomerWelcomeEmail(customer).catch((err) => console.error('[CHECKOUT WELCOME EMAIL ERROR]:', err));
      }
    } else {
      // Keep customer default shipping details up to date
      await updateCustomerProfile(customer.id, {
        address_line1: shipping_address_line1,
        address_line2: shipping_address_line2,
        city: shipping_city,
        state: shipping_state,
        postal_code: shipping_postal_code,
        phone: customer_phone,
      });
    }

    // 1. Create order and reserve stock server-side with customer_id
    const { order, razorpayAmountPaise } = await createOrderWithReservation({
      customer_id: customer.id,
      customer_name: customer_name.trim(),
      customer_email: normalizedEmail,
      customer_phone: customer_phone.trim(),
      shipping_address_line1: shipping_address_line1.trim(),
      shipping_address_line2: shipping_address_line2?.trim() || null,
      shipping_city: shipping_city.trim(),
      shipping_state: shipping_state.trim(),
      shipping_postal_code: shipping_postal_code.trim(),
      shipping_country: shipping_country?.trim() || 'India',
      items,
      notes,
    });

    // 2. Create Razorpay order on server
    const razorpayOrder = await createRazorpayOrder({
      amountPaise: razorpayAmountPaise,
      currency: 'INR',
      receipt: order.order_reference,
      notes: {
        internal_order_id: order.id,
        order_reference: order.order_reference,
        customer_id: customer.id,
        customer_email: order.customer_email,
      },
    });

    // 3. Persist association between internal order and Razorpay order
    await attachRazorpayOrderId(order.id, razorpayOrder.razorpayOrderId);

    const publicRazorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder_key_id';

    const response = NextResponse.json({
      success: true,
      orderId: order.id,
      orderReference: order.order_reference,
      razorpayOrderId: razorpayOrder.razorpayOrderId,
      amountPaise: razorpayOrder.amountPaise,
      currency: razorpayOrder.currency,
      isSimulator: razorpayOrder.isSimulator,
      keyId: publicRazorpayKeyId,
      customer: {
        id: customer.id,
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
      },
    });

    if (sessionTokenToSet) {
      response.cookies.set(COOKIE_NAME, sessionTokenToSet, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      });
    }

    return response;
  } catch (err: any) {
    console.error('Checkout error:', err);
    const errorMessage =
      err?.error?.description ||
      err?.description ||
      err?.message ||
      'Internal order creation failed';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
