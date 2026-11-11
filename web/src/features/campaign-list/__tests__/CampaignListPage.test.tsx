import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { Campaign } from '@shared/contracts';
import CampaignListPage from '../CampaignListPage';
import { useCampaignListStore } from '../store';
import * as api from '@/lib/api';

const campaign = (over: Partial<Campaign>): Campaign => ({
  id: 'cmp_1', tenantId: 'tenant-a', name: 'Promo', channel: 'SMS', messageTemplate: 'hi', scheduledAt: null,
  status: 'RUNNING', totalRecipients: 100, sentCount: 60, failedCount: 30, pendingCount: 10, retryQueueSize: 0,
  createdAt: '2026-11-11T08:00:00.000Z', updatedAt: '2026-11-11T08:00:00.000Z', ...over,
});

const renderPage = (url = '/campaigns') => render(<MemoryRouter initialEntries={[url]}><CampaignListPage /></MemoryRouter>);

beforeEach(() => {
  useCampaignListStore.setState({ data: null, state: 'idle', error: null, queryKey: '', tenants: [] });
  vi.spyOn(api, 'listTenants').mockResolvedValue(['tenant-a', 'tenant-b']);
});
afterEach(() => vi.restoreAllMocks());

describe('CampaignListPage', () => {
  it('shows campaigns and highlights a failure rate above 20%', async () => {
    vi.spyOn(api, 'listCampaigns').mockResolvedValue({ items: [campaign({})], page: 1, pageSize: 10, total: 1 });
    renderPage();
    expect((await screen.findAllByText('Promo')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('30')[0]).toHaveClass('text-red-600');
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1–1 of 1');
  });

  it('shows the empty state for filters with no results', async () => {
    vi.spyOn(api, 'listCampaigns').mockResolvedValue({ items: [], page: 1, pageSize: 10, total: 0 });
    renderPage('/campaigns?status=FAILED');
    expect(await screen.findByText('No campaigns match these filters')).toBeInTheDocument();
  });

  it('shows an error with a working retry button', async () => {
    const spy = vi.spyOn(api, 'listCampaigns')
      .mockRejectedValueOnce(new api.ApiError('Cannot reach the server.'))
      .mockResolvedValue({ items: [campaign({ name: 'Recovered' })], page: 1, pageSize: 10, total: 1 });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect((await screen.findAllByText('Recovered')).length).toBeGreaterThan(0);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('sends the selected filter to the API', async () => {
    const spy = vi.spyOn(api, 'listCampaigns').mockResolvedValue({ items: [], page: 1, pageSize: 10, total: 0 });
    renderPage();
    await userEvent.selectOptions(await screen.findByLabelText('Channel'), 'EMAIL');
    await waitFor(() => expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ channel: 'EMAIL', page: 1 }), expect.anything()));
  });
});
