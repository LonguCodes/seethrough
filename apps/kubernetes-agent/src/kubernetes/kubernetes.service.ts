import { Injectable, Logger } from '@nestjs/common';
import * as k8s from '@kubernetes/client-node';

@Injectable()
export class KubernetesService {
  private readonly logger = new Logger(KubernetesService.name);
  private readonly kc: k8s.KubeConfig;
  private readonly k8sApi: k8s.CoreV1Api;

  constructor() {
    this.kc = new k8s.KubeConfig();
    try {
      this.kc.loadFromDefault();
    } catch (e) {
      this.logger.warn('Failed to load local kubeconfig, attempting in-cluster config');
      try {
        this.kc.loadFromCluster();
      } catch (e2) {
        this.logger.error('Failed to load any kubernetes config');
      }
    }
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
  }

  async getClusterInfo() {
    try {
      const [nodes, pods, namespaces, pvcs] = await Promise.all([
        this.k8sApi.listNode(),
        this.k8sApi.listPodForAllNamespaces(),
        this.k8sApi.listNamespace(),
        this.k8sApi.listPersistentVolumeClaimForAllNamespaces(),
      ]);

      return {
        nodes: nodes.items.map(node => ({
          name: node.metadata.name,
          status: node.status.conditions.find(c => c.type === 'Ready')?.status,
          cpu: node.status.capacity.cpu,
          memory: node.status.capacity.memory,
          kubeletVersion: node.status.nodeInfo.kubeletVersion,
          operatingSystem: node.status.nodeInfo.operatingSystem,
        })),
        pods: pods.items.map(pod => ({
          name: pod.metadata.name,
          namespace: pod.metadata.namespace,
          status: pod.status.phase,
          nodeName: pod.spec.nodeName,
          podIP: pod.status.podIP,
          startTime: pod.status.startTime,
          labels: pod.metadata.labels,
        })),
        namespaces: namespaces.items.map(ns => ({
          name: ns.metadata.name,
          status: ns.status.phase,
        })),
        pvcs: pvcs.items.map(pvc => ({
          name: pvc.metadata.name,
          namespace: pvc.metadata.namespace,
          status: pvc.status.phase,
          volumeName: pvc.spec.volumeName,
          storageClass: pvc.spec.storageClassName,
          capacity: pvc.status.capacity?.storage,
          accessModes: pvc.spec.accessModes,
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error fetching cluster info: ${error.message}`);
      throw error;
    }
  }
}
