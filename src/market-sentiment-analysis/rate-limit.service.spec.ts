import { RateLimitService } from '../rate-limit.service';

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(() => {
    service = new RateLimitService();
  });

  describe('isAllowed', () => {
    it('should allow requests within limit', () => {
      for (let i = 0; i < 50; i++) {
        expect(service.isAllowed('user1')).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      // Fill up the rate limit
      for (let i = 0; i < 100; i++) {
        service.isAllowed('user1');
      }

      // Next request should be blocked
      expect(service.isAllowed('user1')).toBe(false);
    });

    it('should track different users separately', () => {
      // Fill up rate limit for user1
      for (let i = 0; i < 100; i++) {
        service.isAllowed('user1');
      }

      // user2 should still be allowed
      expect(service.isAllowed('user2')).toBe(true);
      expect(service.isAllowed('user1')).toBe(false);
    });
  });

  describe('getRemainingRequests', () => {
    it('should return correct remaining requests', () => {
      expect(service.getRemainingRequests('user1')).toBe(100);

      service.isAllowed('user1');
      expect(service.getRemainingRequests('user1')).toBe(99);

      for (let i = 0; i < 50; i++) {
        service.isAllowed('user1');
      }
      expect(service.getRemainingRequests('user1')).toBe(49);
    });

    it('should return 0 when limit exceeded', () => {
      for (let i = 0; i < 100; i++) {
        service.isAllowed('user1');
      }

      expect(service.getRemainingRequests('user1')).toBe(0);
    });
  });
});