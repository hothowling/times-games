import { orderWords, numerator } from './rules.js';

export const TOPPINGS = ['cheese', 'tomato', 'mushroom'];

// The UI and the recorded speech use the same sentence builder.
export function orderText(order, topping) {
  const whole = order.parts.length === 1 && numerator(order) === order.denominator;
  return whole ? `I'd like one whole ${topping} pizza, please.`
    : `I'd like ${orderWords(order)} of a ${topping} pizza, please.`;
}

export const voiceFor = (order, topping) => `assets/voice/cafe/en/${order.id}-${topping}.m4a`;
