// src/middleware/audit.js
// export function audit(action) {
//   return (req, _res, next) => {
//     const event = {
//       ts: new Date().toISOString(),
//       actorRole: req.user?.role || 'unknown',
//       action,
//       path: req.originalUrl,
//       method: req.method,
//       ip: req.ip,
//       body: req.body && Object.keys(req.body).length ? req.body : undefined,
//       params: req.params && Object.keys(req.params).length ? req.params : undefined,
//       query: req.query && Object.keys(req.query).length ? req.query : undefined
//     };
//     // For now, log to console. Later: write to DB or file.
//     console.log('[AUDIT]', JSON.stringify(event));
//     next();
//   };
// }


export function audit(actionName) {
  return (req, res, next) => {
    const role = req.headers['x-user-role'] || 'unknown';
    const who = req.headers['x-user-id'] || req.ip;
    req.audit = { at: new Date().toISOString(), action: actionName, role, who };
    // You can persist to DB/ELK/etc. For now, log:
    console.log('[AUDIT]', req.audit, 'payload=', req.body || {});
    next();
  };
}