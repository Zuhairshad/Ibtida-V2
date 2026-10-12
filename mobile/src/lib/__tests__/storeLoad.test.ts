import AsyncStorage from '@react-native-async-storage/async-storage';
import { hydrate, set } from '../../state/store';

// A storage read that fails is not the same as "nothing saved": the saved copy must survive.
describe('loading saved data', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('never writes defaults over data it could not read', async () => {
    const get = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('disk I/O error'));
    const put = jest.spyOn(AsyncStorage, 'setItem');
    const loading = hydrate();
    await jest.advanceTimersByTimeAsync(1000);
    await loading;
    expect(get).toHaveBeenCalledTimes(3);
    set({ name: 'Someone' });
    await jest.advanceTimersByTimeAsync(1000);
    expect(put).not.toHaveBeenCalled();
    get.mockRestore();
  });
});
