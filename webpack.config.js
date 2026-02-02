/**
 * Custom webpack config for NestJS build.
 * Ensures root node_modules is used so @fastify/multipart (and other root deps) resolve.
 */
const path = require("path");

module.exports = function (options) {
  const rootNodeModules = path.join(__dirname, "node_modules");
  return {
    ...options,
    resolve: {
      ...options.resolve,
      modules: [
        rootNodeModules,
        ...(options.resolve?.modules || ["node_modules"]),
      ],
    },
  };
};
