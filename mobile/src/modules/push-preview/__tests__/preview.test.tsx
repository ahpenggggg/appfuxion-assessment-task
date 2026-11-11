import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NotificationPreview } from '../components/NotificationPreview';
import { estimateLines, lineRules, truncationReport, WIDTH_PRESETS } from '../lib/layout';
import { parseTemplate, renderTemplate } from '../lib/template';

describe('template', () => {
  it('fills known placeholders and flags unknown ones', () => {
    expect(renderTemplate('Hi {{firstName}}, code {{ code }}', { firstName: 'Aisyah' })).toEqual({ text: 'Hi Aisyah, code {{ code }}', missing: ['code'] });
    expect(parseTemplate('{{a}}!', {})).toEqual([{ text: '{{a}}', missing: true }, { text: '!', missing: false }]);
  });
});

describe('layout rules', () => {
  it('collapsed Android shows one body line; expanded iOS shows many', () => {
    expect(lineRules('android', 'collapsed', false).bodyLines).toBe(1);
    expect(lineRules('ios', 'expanded', false).bodyLines).toBeGreaterThan(4);
  });

  it('narrow screens need more lines for the same text', () => {
    const text = 'x'.repeat(200);
    expect(estimateLines(text, 220, 14)).toBeGreaterThan(estimateLines(text, 500, 14));
  });

  it('reports a long body as cut when collapsed but not when expanded', () => {
    const body = 'word '.repeat(60);
    expect(truncationReport('android', 'collapsed', 360, 'Title', body, false).bodyCut).toBe(true);
    expect(truncationReport('ios', 'expanded', 390, 'Title', body, false).bodyCut).toBe(false);
  });
});

describe('NotificationPreview', () => {
  const props = {
    appName: 'Notify',
    title: parseTemplate('Sale ends tonight, {{firstName}}!', { firstName: 'Aisyah' }),
    body: parseTemplate('Take 50% off with code {{code}}.', {}),
    imageUrl: 'https://example.com/img.jpg',
  };

  it.each([
    ['ios', 'collapsed'],
    ['ios', 'expanded'],
    ['android', 'collapsed'],
    ['android', 'expanded'],
  ] as const)('renders %s %s consistently', async (platform, state) => {
    const r = await render(<NotificationPreview {...props} platform={platform} state={state} width={390} />);
    expect(r.toJSON()).toMatchSnapshot();
  });

  it('uses the given screen width', async () => {
    for (const w of WIDTH_PRESETS) {
      const r = await render(<NotificationPreview {...props} platform="android" state="collapsed" width={w.width} />);
      expect(screen.getByTestId('preview-android')).toHaveStyle({ width: w.width });
      await r.unmount();
    }
  });

  it('highlights placeholders that have no sample value', async () => {
    await render(<NotificationPreview {...props} platform="ios" state="collapsed" width={390} />);
    expect(screen.getByText('{{code}}')).toHaveStyle({ backgroundColor: '#FDE68A' });
  });
});
