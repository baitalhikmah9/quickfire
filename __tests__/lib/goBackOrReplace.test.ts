import { goBackOrReplace } from '@/lib/navigation/goBackOrReplace';

describe('goBackOrReplace', () => {
  it('calls back when the stack has history', () => {
    const router = {
      canGoBack: jest.fn(() => true),
      back: jest.fn(),
      replace: jest.fn(),
    };

    goBackOrReplace(router as never, '/(app)/');

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('replaces with fallback when there is no stack history', () => {
    const router = {
      canGoBack: jest.fn(() => false),
      back: jest.fn(),
      replace: jest.fn(),
    };

    goBackOrReplace(router as never, '/(app)/');

    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(app)/');
  });
});
