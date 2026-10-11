// Uploads are slow compared with tapping: nothing counted or edited during one may be lost.
let release: (() => void) | null = null;
const calls: { fn: string; amount: number }[] = [];

jest.mock('../supabase', () => ({
  supabase: {
    rpc: (fn: string, args: { p_amount: number }) => {
      calls.push({ fn, amount: args.p_amount });
      // The first upload stays in flight until the test releases it.
      if (calls.length === 1) return new Promise(r => { release = () => r({ data: null, error: null }); });
      return Promise.resolve({ data: null, error: null });
    },
  },
  currentUserId: () => 'user-1',
  onSession: () => () => {},
}));

import { enqueueCircleContribution, pendingOp, syncNow } from '../sync';

describe('outbox', () => {
  it('keeps contributions made while an upload is in flight', async () => {
    enqueueCircleContribution('goal-1', 5);
    const first = syncNow();
    await new Promise(r => setTimeout(r, 0));
    expect(calls).toEqual([{ fn: 'contribute_to_goal', amount: 5 }]);

    // Three more taps land while the 5 are still uploading.
    enqueueCircleContribution('goal-1', 3);
    release!();
    await first;
    expect(pendingOp('circle-contrib:goal-1')?.p.n).toBe(3);

    await syncNow();
    expect(calls).toEqual([{ fn: 'contribute_to_goal', amount: 5 }, { fn: 'contribute_to_goal', amount: 3 }]);
    expect(pendingOp('circle-contrib:goal-1')).toBeUndefined();
  });
});
