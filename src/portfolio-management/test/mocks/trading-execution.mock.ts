export const mockTradingExecutionService = {
  executeTrade: jest.fn().mockImplementation((order: any) => {
    return Promise.resolve({
      success: true,
      orderId: `ORDER_${Date.now()}`,
      executedPrice: order.symbol === 'AAPL' ? 175 : 100,ById: jest.fn(),
            getPortfolioHoldings: jest.fn(),
            updatePortfolioValue: jest.fn(),
          },
        },
        {
          provide: TradingExecutionService,
          useValue: {
            executeTrade: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RebalancingService>(RebalancingService);
    portfolioRepository = module.get<Repository<Portfolio>>(getRepositoryToken(Portfolio));
    portfolioService = module.get<PortfolioService>(PortfolioService);
    tradingExecutionService = module.get<TradingExecutionService>(TradingExecutionService);
  });

  describe('analyzeRebalancing', () => {
    it('should analyze rebalancing needs correctly', async () => {
      jest.spyOn(portfolioService, 'getPortfolioById').mockResolvedValue(mockPortfolio as any);
      jest.spyOn(portfolioService, 'getPortfolioHoldings').mockResolvedValue(mockHoldings as any);

      const result = await service.analyzeRebalancing('1');

      expect(result.portfolioId).toBe('1');
      expect(result.rebalancingNeeded).toBe(true); // 70% stocks vs 60% target = 10% deviation > 5% threshold
      expect(result.currentAllocations.stocks).toBe(70);
      expect(result.currentAllocations.bonds).toBe(30);
      expect(result.deviations.stocks).toBe(10);
      expect(result.deviations.bonds).toBe(10);
    });

    it('should suggest appropriate trades for rebalancing', async () => {
      jest.spyOn(portfolioService, 'getPortfolioById').mockResolvedValue(mockPortfolio as any);
      jest.spyOn(portfolioService, 'getPortfolioHoldings').mockResolvedValue(mockHoldings as any);

      const result = await service.analyzeRebalancing('1');

      expect(result.suggestedTrades).toHaveLength(2);
      expect(result.suggestedTrades[0].action).toBe('sell'); // Sell overweight stocks
      expect(result.suggestedTrades[1].action).toBe('buy'); // Buy underweight bonds
    });
  });

  describe('executeRebalancing', () => {
    it('should execute rebalancing trades successfully', async () => {
      const mockAnalysis = {
        portfolioId: '1',
        suggestedTrades: [
          { symbol: 'AAPL', action: 'sell', quantity: 5.71, amount: 1000 },
          { symbol: 'BND', action: 'buy', quantity: 11.76, amount: 1000 },
        ],
      };

      jest.spyOn(service, 'analyzeRebalancing').mockResolvedValue(mockAnalysis as any);
      jest.spyOn(portfolioService, 'getPortfolioById').mockResolvedValue(mockPortfolio as any);
      jest.spyOn(tradingExecutionService, 'executeTrade').mockResolvedValue({
        success: true,
        executedPrice: 175,
      } as any);
      jest.spyOn(portfolioService, 'updatePortfolioValue').mockResolvedValue();

      await service.executeRebalancing('1');

      expect(tradingExecutionService.executeTrade).toHaveBeenCalledTimes(2);
      expect(portfolioService.updatePortfolioValue).toHaveBeenCalledWith('1');
    });

    it('should handle trading execution failures', async () => {
      const mockAnalysis = {
        portfolioId: '1',
        suggestedTrades: [
          { symbol: 'AAPL', action: 'sell', quantity: 5.71, amount: 1000 },
        ],
      };

      jest.spyOn(service, 'analyzeRebalancing').mockResolvedValue(mockAnalysis as any);
      jest.spyOn(portfolioService, 'getPortfolioById').mockResolvedValue(mockPortfolio as any);
      jest.spyOn(tradingExecutionService, 'executeTrade').mockResolvedValue({
        success: false,
        message: 'Trade failed',
      } as any);

      await expect(service.executeRebalancing('1')).rejects.toThrow();
    });
  });

  describe('runAutomaticRebalancing', () => {
    it('should run automatic rebalancing for enabled portfolios', async () => {
      const activePortfolios = [
        { id: '1', rebalancingSettings: { enabled: true } },
        { id: '2', rebalancingSettings: { enabled: false } },
      ];

      jest.spyOn(portfolioRepository, 'find').mockResolvedValue(activePortfolios as any);
      jest.spyOn(service, 'analyzeRebalancing').mockResolvedValue({
        rebalancingNeeded: true,
      } as any);
      jest.spyOn(service, 'executeRebalancing').mockResolvedValue();

      await service.runAutomaticRebalancing();

      expect(service.analyzeRebalancing).toHaveBeenCalledWith('1');
      expect(service.executeRebalancing).toHaveBeenCalledWith('1', { automatic: true });
      expect(service.analyzeRebalancing).not.toHaveBeenCalledWith('2');
    });
  });
});
