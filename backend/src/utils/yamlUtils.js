// src/utils/yamlUtils.js
import yaml from 'js-yaml';

export const objectToYAML = (obj) => {
  try {
    return yaml.dump(obj, { noRefs: true });
  } catch (e) {
    console.error('[YAML Error]', e);
    return '';
  }
};
