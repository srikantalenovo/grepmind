// src/utils/k8sClient.js
import k8s from '@kubernetes/client-node';

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const core = kc.makeApiClient(k8s.CoreV1Api);
const apps = kc.makeApiClient(k8s.AppsV1Api);
const objectApi = k8s.KubernetesObjectApi.makeApiClient(kc);
const k8sYaml = k8s;

export { kc, core, apps, objectApi, k8s, k8sYaml };
