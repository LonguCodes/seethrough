import { Repository } from 'typeorm';
import { MachineMetric } from '../metric.entity.js';
import { IMetricsStorage } from './metrics-storage.interface.js';

export class PostgresStorageStrategy implements IMetricsStorage {
  constructor(private readonly repository: Repository<MachineMetric>) {}

  async save(metric: Partial<MachineMetric>): Promise<MachineMetric> {
    const entity = this.repository.create(metric);
    return this.repository.save(entity);
  }

  async getLatest(): Promise<MachineMetric[]> {
    return this.repository
      .createQueryBuilder('metric')
      .distinctOn(['metric.machineId'])
      .orderBy('metric.machineId', 'ASC')
      .addOrderBy('metric.timestamp', 'DESC')
      .getMany();
  }

  async getHistory(machineId: string): Promise<MachineMetric[]> {
    return this.repository.find({
      where: { machineId },
      order: { timestamp: 'DESC' },
      take: 100,
    });
  }
}
