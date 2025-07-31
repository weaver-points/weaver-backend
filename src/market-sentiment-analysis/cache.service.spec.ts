import { SentimentCacheService } from '../cache.service';

describe('SentimentCacheService', () => {
  let service: SentimentCacheService;

  beforeEach(() => {
    service = new SentimentCacheService();
  });

  describe('set and get', () => {
    it('should store and retrieve data', () => {
      const testData = { sentiment: 0.5, confidence: 0.8 };
      
      service.set('BTC:sentiment', testData);
      const result = service.get('BTC:sentiment');

      expect(result).toEqual(testData);
    });

    it('should return null for expired data', (done) => {
      const testData = { sentiment: 0.5 };
      
      service.set('BTC:sentiment', testData, 10); // 10ms TTL
      
      setTimeout(() => {
        const result = service.get('BTC:sentiment');
        expect(result).toBeNull();
        done();
      }, 20);
    });

    it('should return null for non-existent keys', () => {
      const result = service.get('NON_EXISTENT');
      expect(result).toBeNull();
    });
  });

  describe('invalidate', () => {
    it('should remove keys matching pattern', () => {
      service.set('BTC:sentiment', { data: 1 });
      service.set('BTC:prediction', { data: 2 });
      service.set('ETH:sentiment', { data: 3 });

      service.invalidate('BTC');

      expect(service.get('BTC:sentiment')).toBeNull();
      expect(service.get('BTC:prediction')).toBeNull();
      expect(service.get('ETH:sentiment')).toEqual({ data: 3 });
    });
  });

  describe('clear', () => {
    it('should remove all cached data', () => {
      service.set('key1', { data: 1 });
      service.set('key2', { data: 2 });

      service.clear();

      expect(service.get('key1')).toBeNull();
      expect(service.get('key2')).toBeNull();
    });
  });
});