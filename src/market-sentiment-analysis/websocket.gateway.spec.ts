import { Test, TestingModule } from '@nestjs/testing';
import { SentimentWebSocketGateway } from '../websocket.gateway';
import { SentimentAnalysisService } from '../sentiment-analysis.service';
import { Socket } from 'socket.io';

describe('SentimentWebSocketGateway', () => {
  let gateway: SentimentWebSocketGateway;
  let mockSocket: Partial<Socket>;
  let mockServer: any;

  const mockSentimentService = {
    getCurrentSentiment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentimentWebSocketGateway,
        { provide: SentimentAnalysisService, useValue: mockSentimentService },
      ],
    }).compile();

    gateway = module.get<SentimentWebSocketGateway>(SentimentWebSocketGateway);
    
    mockSocket = {
      id: 'test-client-id',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
    };

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    gateway.server = mockServer;
  });

  describe('handleConnection', () => {
    it('should initialize client subscription set', () => {
      gateway.handleConnection(mockSocket as Socket);

      expect(gateway['subscribedClients'].has('test-client-id')).toBe(true);
      expect(gateway['subscribedClients'].get('test-client-id')).toEqual(new Set());
    });
  });

  describe('handleDisconnect', () => {
    it('should remove client from subscriptions', () => {
      gateway['subscribedClients'].set('test-client-id', new Set(['BTC']));

      gateway.handleDisconnect(mockSocket as Socket);

      expect(gateway['subscribedClients'].has('test-client-id')).toBe(false);
    });
  });

  describe('handleSubscribe', () => {
    it('should subscribe client to symbols', () => {
      gateway['subscribedClients'].set('test-client-id', new Set());

      gateway.handleSubscribe(mockSocket as Socket, { symbols: ['BTC', 'ETH'] });

      const clientSymbols = gateway['subscribedClients'].get('test-client-id');
      expect(clientSymbols?.has('BTC')).toBe(true);
      expect(clientSymbols?.has('ETH')).toBe(true);
      expect(mockSocket.join).toHaveBeenCalledWith('symbol:BTC');
      expect(mockSocket.join).toHaveBeenCalledWith('symbol:ETH');
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribed', {
        symbols: ['BTC', 'ETH'],
        message: 'Successfully subscribed to real-time updates',
      });
    });
  });

  describe('handleUnsubscribe', () => {
    it('should unsubscribe client from symbols', () => {
      const clientSymbols = new Set(['BTC', 'ETH', 'AAPL']);
      gateway['subscribedClients'].set('test-client-id', clientSymbols);

      gateway.handleUnsubscribe(mockSocket as Socket, { symbols: ['BTC', 'ETH'] });

      expect(clientSymbols.has('BTC')).toBe(false);
      expect(clientSymbols.has('ETH')).toBe(false);
      expect(clientSymbols.has('AAPL')).toBe(true);
      expect(mockSocket.leave).toHaveBeenCalledWith('symbol:BTC');
      expect(mockSocket.leave).toHaveBeenCalledWith('symbol:ETH');
    });
  });

  describe('broadcastSentimentUpdate', () => {
    it('should broadcast sentiment update to subscribed clients', () => {
      const testData = { sentiment_score: 0.5, confidence: 0.8 };

      gateway.broadcastSentimentUpdate('BTC', testData);

      expect(mockServer.to).toHaveBeenCalledWith('symbol:BTC');
      expect(mockServer.emit).toHaveBeenCalledWith('sentiment_update', {
        symbol: 'BTC',
        ...testData,
        timestamp: expect.any(Date),
      });
    });
  });
});
