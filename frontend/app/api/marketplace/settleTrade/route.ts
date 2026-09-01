// app/api/marketplace/settle/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { ethers } from 'ethers';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const supabaseAdminClient = supabaseAdmin;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id, tx_hash, amount_bought } = await req.json();

    // 1. Fetch the original sell order
    const { data: order, error: orderError } = await supabase
      .from('token_orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Calculate remaining & filled quantities
    const newRemaining = Number(order.quantity_remaining) - Number(amount_bought);
    const newFilled = Number(order.quantity_filled || 0) + Number(amount_bought);
    const isCompleted = newRemaining <= 0;

    // 3. Update the listing in token_orders
    await supabase
      .from('token_orders')
      .update({
        quantity_remaining: Math.max(0, newRemaining),
        quantity_filled: newFilled,
        status: isCompleted ? 'filled' : 'partially_filled',
      })
      .eq('id', order_id);

    // 4. Deduct tokens from Seller in `tokens` table
    const { data: sellerToken } = await supabaseAdminClient
      .from('tokens')
      .select('id, amount')
      .eq('user_id', order.investor_id)
      .eq('campaign_id', order.campaign_id)
      .single();

    if (sellerToken) {
      await supabaseAdminClient
        .from('tokens')
        .update({ amount: Math.max(0, Number(sellerToken.amount) - Number(amount_bought)) })
        .eq('id', sellerToken.id);
    }

    // 5. Credit tokens to Buyer in `tokens` table
    const { data: buyerToken } = await supabase
      .from('tokens')
      .select('id, amount')
      .eq('user_id', user.id)
      .eq('campaign_id', order.campaign_id)
      .maybeSingle();

    if (buyerToken) {
      // Buyer already has an entry for this campaign: update balance
      await supabase
        .from('tokens')
        .update({ amount: Number(buyerToken.amount) + Number(amount_bought) })
        .eq('id', buyerToken.id);
    } else {
      // First time holding this token: insert new row
      await supabase
        .from('tokens')
        .insert({
          user_id: user.id,
          campaign_id: order.campaign_id,
          amount: Number(amount_bought),
        });
    }

    // 6. Record transaction history for both Buyer and Seller
    await supabaseAdminClient.from('transactions').insert([
      {
        user_id: user.id,
        campaign_id: Number(order.campaign_id),
        type: 'secondary_buy',
        token_amount: amount_bought,
        price_per_token: order.price,
        token_symbol: order.token_symbol,
        status: 'completed',
        tx_hash: tx_hash,
        reference_id: order_id,
      },
      {
        user_id: order.investor_id,
        campaign_id: Number(order.campaign_id),
        type: 'secondary_sell',
        token_amount: amount_bought,
        price_per_token: order.price,
        token_symbol: order.token_symbol,
        status: 'completed',
        tx_hash: tx_hash,
        reference_id: order_id,
      },
    ]);

    return NextResponse.json({ success: true, tx_hash });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}