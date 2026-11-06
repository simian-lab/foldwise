import { describe, it, expect } from 'vitest';
import { feed, flautaCarousel, pollStory, stepsStory, SOCIAL_BIO } from '../../src/data/social';
import { taglines } from '../../src/data/brand';

const posts = [...feed, flautaCarousel];

describe('social examples', () => {
  it('has a 9-post feed and a 4-slide carousel', () => {
    expect(feed).toHaveLength(9);
    expect(flautaCarousel.slides).toHaveLength(4);
    expect(new Set(feed.map((p) => p.id)).size).toBe(9);
  });

  it('every caption carries 1 to 3 Spanish hashtags', () => {
    for (const p of posts) {
      expect(p.caption.length).toBeGreaterThan(20);
      expect(p.hashtags.length).toBeGreaterThanOrEqual(1);
      expect(p.hashtags.length).toBeLessThanOrEqual(3);
      for (const h of p.hashtags) expect(h).toMatch(/^#[a-zñáéíóú]+$/);
    }
  });

  it('invents no numbers: the only figure is the real 25-box minimum', () => {
    const texts = [
      ...posts.map((p) => p.caption),
      ...feed.flatMap((p) => ('text' in p.media ? [p.media.text, p.media.sub ?? ''] : [])),
      ...flautaCarousel.slides.flatMap((s) => ('text' in s ? [s.text, s.sub ?? ''] : [])),
      pollStory.question,
      ...stepsStory.steps,
    ];
    for (const t of texts) {
      for (const n of t.match(/\d+/g) ?? []) expect(n).toBe('25');
    }
  });

  it('alternates the rhythm: no two neighbours in a row share a type', () => {
    for (let r = 0; r < 3; r++) {
      const row = feed.slice(r * 3, r * 3 + 3).map((p) => p.rhythm);
      expect(row[0]).not.toBe(row[1]);
      expect(row[1]).not.toBe(row[2]);
    }
  });

  it('the bio is the brand tagline', () => {
    expect(SOCIAL_BIO[0]).toBe(taglines.principal);
  });
});
