type Direction = 'up' | 'down';

export class TrendCalculator {
    private history: Direction[] = [];
    private readonly maxHistory: number = 5;

    public calculateNextTrend(): { direction: Direction; trend: string } {
        const direction: Direction = Math.random() < 0.5 ? 'down' : 'up';
        
        this.history.push(direction);

        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        // Calculate trend including the current direction
        const upCount = this.history.filter(d => d === 'up').length;
        const downCount = this.history.filter(d => d === 'down').length;
        
        let trend: string;
        if (upCount === downCount) {
            trend = 'neutral';
        } else {
            trend = upCount > downCount ? 'upward' : 'downward';
        }

        return {
            direction,
            trend
        };
    }

    public getHistory(): Direction[] {
        return [...this.history];
    }
}