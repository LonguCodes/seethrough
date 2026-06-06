import * as k8s from '@kubernetes/client-node';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class KubernetesService {
  private readonly logger = new Logger(KubernetesService.name);
  private readonly kc: k8s.KubeConfig;
  private readonly k8sApi: k8s.CoreV1Api;
  private readonly appsApi: k8s.AppsV1Api;

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
    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
  }

  async getClusterInfo() {
    try {
      const [nodes, pods, namespaces, pvcs, deployments, statefulSets, daemonSets] = await Promise.all([
        this.k8sApi.listNode(),
        this.k8sApi.listPodForAllNamespaces(),
        this.k8sApi.listNamespace(),
        this.k8sApi.listPersistentVolumeClaimForAllNamespaces(),
        this.appsApi.listDeploymentForAllNamespaces(),
        this.appsApi.listStatefulSetForAllNamespaces(),
        this.appsApi.listDaemonSetForAllNamespaces(),
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
          containerStatuses: pod.status.containerStatuses?.map(cs => ({
            name: cs.name,
            ready: cs.ready,
            restartCount: cs.restartCount,
            state: cs.state?.running ? 'Running'
              : cs.state?.waiting ? `Waiting:${cs.state.waiting.reason}`
              : cs.state?.terminated ? `Terminated:${cs.state.terminated.reason}`
              : 'Unknown',
            started: cs.started,
          })) || [],
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
        deployments: deployments.items.map(dep => ({
          name: dep.metadata.name,
          namespace: dep.metadata.namespace,
          replicas: dep.status.replicas ?? 0,
          readyReplicas: dep.status.readyReplicas ?? 0,
          availableReplicas: dep.status.availableReplicas ?? 0,
          unavailableReplicas: dep.status.unavailableReplicas ?? 0,
          updatedReplicas: dep.status.updatedReplicas ?? 0,
          conditions: dep.status.conditions?.map(c => ({
            type: c.type,
            status: c.status,
            reason: c.reason,
            message: c.message,
          })) || [],
        })),
        statefulSets: statefulSets.items.map(sts => ({
          name: sts.metadata.name,
          namespace: sts.metadata.namespace,
          replicas: sts.status.replicas ?? 0,
          readyReplicas: sts.status.readyReplicas ?? 0,
          currentReplicas: sts.status.currentReplicas ?? 0,
          updatedReplicas: sts.status.updatedReplicas ?? 0,
          availableReplicas: sts.status.availableReplicas ?? 0,
          conditions: sts.status.conditions?.map(c => ({
            type: c.type,
            status: c.status,
            reason: c.reason,
            message: c.message,
          })) || [],
        })),
        daemonSets: daemonSets.items.map(ds => ({
          name: ds.metadata.name,
          namespace: ds.metadata.namespace,
          desiredNumberScheduled: ds.status.desiredNumberScheduled ?? 0,
          currentNumberScheduled: ds.status.currentNumberScheduled ?? 0,
          numberReady: ds.status.numberReady ?? 0,
          numberAvailable: ds.status.numberAvailable ?? 0,
          numberUnavailable: ds.status.numberUnavailable ?? 0,
          updatedNumberScheduled: ds.status.updatedNumberScheduled ?? 0,
          conditions: ds.status.conditions?.map(c => ({
            type: c.type,
            status: c.status,
            reason: c.reason,
            message: c.message,
          })) || [],
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error fetching cluster info: ${error.message}`);
      throw error;
    }
  }
}