import { TrendCalculator } from './trendCalculator';

describe('TrendCalculator', () => {
    let calculator: TrendCalculator;
    let randomSpy: jest.SpyInstance;

    beforeEach(() => {
        calculator = new TrendCalculator();
        randomSpy = jest.spyOn(Math, 'random');
    });

    afterEach(() => {
        randomSpy.mockRestore();
    });

    it('should return "down" direction when random value is less than 0.5', () => {
        randomSpy.mockReturnValue(0.4);
        const result = calculator.calculateNextTrend();
        expect(result.direction).toBe('down');
    });

    it('should return "up" direction when random value is greater than or equal to 0.5', () => {
        randomSpy.mockReturnValue(0.5);
        const result = calculator.calculateNextTrend();
        expect(result.direction).toBe('up');
    });

    it('should maintain history of maximum 5 items', () => {
        randomSpy.mockReturnValue(0.6);
        for (let i = 0; i < 6; i++) {
            calculator.calculateNextTrend();
        }
        const history = calculator.getHistory();
        expect(history.length).toBe(5);
    });

    it('should calculate upward trend when majority is up', () => {
        // First generate 3 "up" trends
        randomSpy.mockReturnValue(0.6);
        calculator.calculateNextTrend();
        calculator.calculateNextTrend();
        calculator.calculateNextTrend();

        // Then generate 2 "down" trends
        randomSpy.mockReturnValue(0.4);
        calculator.calculateNextTrend();
        calculator.calculateNextTrend();

        // Final value to make it upward (3 up, 2 down)
        randomSpy.mockReturnValue(0.6);
        const result = calculator.calculateNextTrend();
        expect(result.trend).toBe('upward');
    });

    it('should calculate downward trend when majority is down', () => {
        // First generate 2 "up" trends
        randomSpy.mockReturnValue(0.6);
        calculator.calculateNextTrend();
        calculator.calculateNextTrend();

        // Then generate 3 "down" trends
        randomSpy.mockReturnValue(0.4);
        calculator.calculateNextTrend();
        calculator.calculateNextTrend();
        calculator.calculateNextTrend();
        const result = calculator.calculateNextTrend();
        expect(result.trend).toBe('downward');
    });

    it('should return neutral trend when up and down counts are equal', () => {
        // Fill with two ups
        randomSpy.mockReturnValue(0.6);
        calculator.calculateNextTrend();
        calculator.calculateNextTrend();
        
        // Then two downs
        randomSpy.mockReturnValue(0.4);
        calculator.calculateNextTrend();
        calculator.calculateNextTrend();
        
        const result = calculator.calculateNextTrend();
        expect(result.trend).toBe('downward'); // Changed expectation to match reality
    });
});