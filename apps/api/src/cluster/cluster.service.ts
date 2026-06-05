import { Injectable, Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';

@Injectable()
export class ClusterService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) { }

  async saveClusterInfo(data: any) {
    const existingKeys = await this.redis.keys('cluster:pod:*');
    const newKeys = (data.pods || []).map((pod: any) => `cluster:pod:${pod.namespace}:${pod.name}`);
    const keysToDelete = existingKeys.filter(k => !newKeys.includes(k));

    const pipeline = this.redis.pipeline();

    // Delete stale pods
    keysToDelete.forEach(key => pipeline.del(key));

    // Store nodes and namespaces with 5 minute TTL
    if (data.nodes) {
      pipeline.set('cluster:nodes', JSON.stringify(data.nodes), 'EX', 300);
    }
    if (data.namespaces) {
      pipeline.set('cluster:namespaces', JSON.stringify(data.namespaces), 'EX', 300);
    }
    if (data.pvcs) {
      pipeline.set('cluster:pvcs', JSON.stringify(data.pvcs), 'EX', 300);
    }
    if (data.deployments) {
      pipeline.set('cluster:deployments', JSON.stringify(data.deployments), 'EX', 300);
    }
    if (data.statefulSets) {
      pipeline.set('cluster:statefulsets', JSON.stringify(data.statefulSets), 'EX', 300);
    }
    if (data.daemonSets) {
      pipeline.set('cluster:daemonsets', JSON.stringify(data.daemonSets), 'EX', 300);
    }

    // Store each pod individually with 5 minute TTL
    if (data.pods && Array.isArray(data.pods)) {
      data.pods.forEach((pod: any) => {
        const key = `cluster:pod:${pod.namespace}:${pod.name}`;
        pipeline.set(key, JSON.stringify(pod), 'EX', 300);
      });
    }

    await pipeline.exec();
    return data;
  }

  async getClusterInfo() {
    const [nodesJson, namespacesJson, pvcsJson, deploymentsJson, statefulSetsJson, daemonSetsJson, keys] = await Promise.all([
      this.redis.get('cluster:nodes'),
      this.redis.get('cluster:namespaces'),
      this.redis.get('cluster:pvcs'),
      this.redis.get('cluster:deployments'),
      this.redis.get('cluster:statefulsets'),
      this.redis.get('cluster:daemonsets'),
      this.redis.keys('cluster:pod:*')
    ]);

    const pods: any[] = [];
    if (keys.length > 0) {
      const podsJson = await this.redis.mget(...keys);
      podsJson.forEach(json => {
        if (json) pods.push(JSON.parse(json));
      });
    }

    return {
      nodes: nodesJson ? JSON.parse(nodesJson) : [],
      namespaces: namespacesJson ? JSON.parse(namespacesJson) : [],
      pvcs: pvcsJson ? JSON.parse(pvcsJson) : [],
      deployments: deploymentsJson ? JSON.parse(deploymentsJson) : [],
      statefulSets: statefulSetsJson ? JSON.parse(statefulSetsJson) : [],
      daemonSets: daemonSetsJson ? JSON.parse(daemonSetsJson) : [],
      pods: pods,
      timestamp: new Date().toISOString()
    };
  }

  async getPodInfo(namespace: string, name: string) {
    const key = `cluster:pod:${namespace}:${name}`;
    const data = await this.redis.get(key);

    if (!data) {
      const keys = await this.redis.keys(`cluster:pod:*`);
      const matchingKey = keys.find(k => k.toLowerCase() === key.toLowerCase());
      if (matchingKey) {
        const retryData = await this.redis.get(matchingKey);
        return retryData ? JSON.parse(retryData) : null;
      }
      return null;
    }

    return JSON.parse(data);
  }
}