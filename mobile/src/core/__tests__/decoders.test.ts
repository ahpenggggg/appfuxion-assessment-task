import { DecodeError, decodeCampaign, decodeCampaignPage } from '../api/decoders';
import { makeCampaign } from '../../test-utils';

describe('decoders', () => {
  it('accepts a valid page', () => {
    const page = decodeCampaignPage({ items: [makeCampaign()], page: 1, pageSize: 100, total: 1 });
    expect(page.items[0].id).toBe('cmp_1');
  });

  it('rejects a malformed page with the failing path', () => {
    expect(() => decodeCampaignPage({ items: 'not-an-array', page: 'x' })).toThrow(DecodeError);
    try {
      decodeCampaignPage({ items: [makeCampaign({ sentCount: '12' as unknown as number })], page: 1, pageSize: 1, total: 1 });
    } catch (e) {
      expect((e as DecodeError).path).toBe('response.items[0].sentCount');
    }
  });

  it('rejects unknown enum values and negative counts', () => {
    expect(() => decodeCampaign({ ...makeCampaign(), status: 'PAUSED' })).toThrow(/status/);
    expect(() => decodeCampaign({ ...makeCampaign(), failedCount: -1 })).toThrow(/failedCount/);
  });

  it('accepts a null schedule time', () => {
    expect(decodeCampaign({ ...makeCampaign(), scheduledAt: null }).scheduledAt).toBeNull();
  });
});
