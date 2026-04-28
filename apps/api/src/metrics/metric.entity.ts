import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class MachineMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  machineId: string;

  @Column({ type: 'float' })
  cpuUsage: number;

  @Column({ type: 'float' })
  ramUsage: number;

  @Column({ type: 'float' })
  diskUsage: number;

  @CreateDateColumn()
  timestamp: Date;
}
