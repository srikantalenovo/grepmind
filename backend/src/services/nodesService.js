// src/services/nodesService.js
import { coreV1Api } from '../config/k8sClient.js';

export const getNodes = async () => {
  try {
    const res = await coreV1Api.listNode();
    const items = res.body.items || [];

    return items.map(node => {
      const name = node.metadata?.name || 'Unnamed';
      const creationTimestamp = node.metadata?.creationTimestamp;
      const addresses = node.status?.addresses || [];
      const internalIP = addresses.find(a => a.type === 'InternalIP')?.address || 'N/A';

      const capacity = node.status?.capacity || {};
      const allocatable = node.status?.allocatable || {};

      const cpuCapacity = capacity.cpu || 'N/A';
      const cpuAllocatable = allocatable.cpu || 'N/A';
      const memCapacity = capacity.memory || 'N/A';
      const memAllocatable = allocatable.memory || 'N/A';

      const kubeletVersion = node.status?.nodeInfo?.kubeletVersion || 'Unknown';
      const conditions = node.status?.conditions || [];
      const readyCondition = conditions.find(c => c.type === 'Ready');
      const status = readyCondition?.status === 'True' ? 'Ready' : 'NotReady';

      return {
        name,
        internalIP,
        cpuCapacity,
        cpuAllocatable,
        memCapacity,
        memAllocatable,
        kubeletVersion,
        status,
        age: getAge(creationTimestamp)
      };
    });
  } catch (err) {
    console.error(`[ERROR] Failed to fetch node details: ${err.message}`);
    throw err;
  }
};

function getAge(creationTimestamp) {
  if (!creationTimestamp) return 'Unknown';
  const created = new Date(creationTimestamp);
  const diffMs = Date.now() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 0) return `${diffDays}d`;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHrs > 0) return `${diffHrs}h`;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  return `${diffMin}m`;
}
