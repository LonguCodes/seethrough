import { MachineMetric } from '../metric.entity.js';
import { IMetricsStorage } from './metrics-storage.interface.js';

export class MultiStorageStrategy implements IMetricsStorage {
  constructor(private readonly strategies: IMetricsStorage[]) {
    if (strategies.length === 0) {
      throw new Error('MultiStorageStrategy requires at least one strategy');
    }
  }

  async save(metric: Partial<MachineMetric>): Promise<MachineMetric> {
    // Save to all strategies in parallel
    const results = await Promise.all(this.strategies.map(s => s.save(metric)));
    // Return the result from the first strategy
    return results[0];
  }

  async getLatest(): Promise<MachineMetric[]> {
    // Always read from the first strategy in the list (primary)
    return this.strategies[0].getLatest();
  }

  async getHistory(machineId: string): Promise<MachineMetric[]> {
    // Always read from the first strategy in the list (primary)
    return this.strategies[0].getHistory(machineId);
  }
}
