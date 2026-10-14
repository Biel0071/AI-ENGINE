'use strict';

/**
 * Classifies architecture only from supplied evidence. File names, CSS classes,
 * and the existence of a package manifest do not prove that a framework or
 * service is active.
 */
class ArchitectureDetector {
  detectArchitecture(inspectionData = {}, projectFiles = []) {
    const files = normalizeFiles(projectFiles);
    const manifest = inspectionData.packageManifest || inspectionData.packageJson || null;
    const dependencies = {
      ...(manifest?.dependencies || {}),
      ...(manifest?.devDependencies || {})
    };
    const header = normalizeHeaders(inspectionData.headers);
    const apis = Array.isArray(inspectionData.apis) ? inspectionData.apis : [];
    const routes = Array.isArray(inspectionData.routes) ? inspectionData.routes : [];
    const dependencyEvidence = (name) => {
      const label = ({ react: 'React', vue: 'Vue', '@angular/core': 'Angular', express: 'Express', fastify: 'Fastify', '@hono/node-server': 'Hono' })[name] || name;
      return Object.prototype.hasOwnProperty.call(dependencies, name)
        ? observed(`${label} dependency declared`, `package.json dependency: ${name}`)
        : unknown(`Nenhuma dependência ${name} foi observada no manifesto disponível.`);
    };

    const frontendFramework = firstEvidence(
      dependencyEvidence('react'),
      dependencyEvidence('vue'),
      dependencyEvidence('@angular/core'),
      unknown('Framework frontend não identificado por evidência disponível.')
    );
    const backendFramework =
      header['x-powered-by']?.toLowerCase().includes('express')
        ? observed('Express response header observed', 'HTTP response header: x-powered-by')
        : firstEvidence(
          dependencyEvidence('express'),
          dependencyEvidence('fastify'),
          dependencyEvidence('@hono/node-server'),
          unknown('Framework backend não identificado por manifesto ou resposta observada.')
        );

    let apiStyle = unknown('Nenhuma requisição de API foi observada.');
    if (apis.length) {
      const graphql = apis.find((item) => endpointOf(item).toLowerCase().includes('graphql'));
      const jsonResponse = apis.find((item) => String(item?.responseContentType || item?.contentType || '').toLowerCase().includes('json'));
      apiStyle = graphql
        ? observed('GraphQL endpoint observed', evidenceSource(graphql, 'network request'))
        : (jsonResponse
          ? observed('HTTP JSON API response observed', evidenceSource(jsonResponse, 'network response content-type'))
          : observed('HTTP API requests observed; response format unknown', 'browser network requests'));
    }

    const authEvidence = inspectionData.authenticationEvidence;
    const authentication = authEvidence?.verified === true && typeof authEvidence.value === 'string'
      ? observed(authEvidence.value, authEvidence.source || 'explicit authentication probe')
      : unknown('Mecanismo de autenticação não foi verificado por fluxo ou configuração acessível.');

    const databaseEvidence = inspectionData.databaseEvidence;
    const database = databaseEvidence?.connected === true
      ? observed(databaseEvidence.engine ? `${databaseEvidence.engine} connection observed` : 'Database connection observed', databaseEvidence.source || 'database health probe')
      : unknown('Conexão e catálogo de banco não foram verificados.');

    const storageEvidence = inspectionData.storageEvidence;
    const storage = storageEvidence?.verified === true
      ? observed(storageEvidence.value || 'Storage provider observed', storageEvidence.source || 'explicit storage probe')
      : unknown('Uso de armazenamento não foi verificado por execução ou configuração ativa.');

    const runningServices = Array.isArray(inspectionData.runtimeEvidence?.services)
      ? inspectionData.runtimeEvidence.services.filter((service) => service?.status === 'RUNNING' && service?.source)
      : [];
    const services = runningServices.length
      ? observed(`Serviços em execução observados: ${runningServices.map((service) => service.name || service.id).join(', ')}`, runningServices.map((service) => service.source).join('; '))
      : unknown('Nenhum processo ou worker em execução foi medido.');

    const declaredPackages = Object.keys(dependencies).sort();
    const dependencyInventory = declaredPackages.length
      ? observed(`${declaredPackages.length} pacotes declarados no manifesto`, 'package.json dependencies and devDependencies')
      : unknown('Manifesto de dependências não foi fornecido.');

    const observedRoutes = routes.map(routeValue).filter(Boolean);
    const routing = observedRoutes.length
      ? observed(`Routes observed (${observedRoutes.length})`, 'browser links or route manifest')
      : unknown('Nenhuma rota ou transição de navegação foi observada.');

    const stateEvidence = inspectionData.stateManagementEvidence;
    const stateManagement = stateEvidence?.verified === true && typeof stateEvidence.value === 'string'
      ? observed(stateEvidence.value, stateEvidence.source || 'explicit state inspection')
      : unknown('Gerenciamento de estado não foi inspecionado.');

    const buildFile = files.find((file) => /(^|\/)(vite|webpack|rollup|esbuild)\.config\./i.test(file));
    const buildSystem = buildFile
      ? observed(`Arquivo de configuração de build presente: ${pathBase(buildFile)}`, `filesystem path: ${buildFile}`)
      : unknown('Configuração de build não foi observada.');

    const classification = {
      frontendFramework,
      backendFramework,
      apiStyle,
      authentication,
      database,
      storage,
      services,
      dependencies: dependencyInventory,
      routing,
      stateManagement,
      buildSystem
    };
    const observedDimensions = Object.entries(classification).filter(([, item]) => item.status === 'OBSERVED');
    const inferredDimensions = Object.entries(classification).filter(([, item]) => item.status === 'INFERRED');
    const unknownDimensions = Object.entries(classification).filter(([, item]) => item.status === 'UNKNOWN');
    const summary = observedDimensions.length
      ? `${observedDimensions.length} dimensões arquiteturais observadas; ${unknownDimensions.length} ainda não verificadas.`
      : 'Nenhum dado arquitetural observado.';

    return {
      architectureId: `arch:${Date.now()}`,
      summary,
      classification,
      evidence: observedDimensions.map(([dimension, item]) => ({ dimension, source: item.evidence.source, value: item.value })),
      epistemicSummary: {
        totalObserved: observedDimensions.length,
        totalInferred: inferredDimensions.length,
        totalUnknown: unknownDimensions.length
      },
      OBSERVED: Object.fromEntries(observedDimensions),
      INFERRED: Object.fromEntries(inferredDimensions),
      UNKNOWN: Object.fromEntries(unknownDimensions),
      updatedAt: new Date().toISOString()
    };
  }
}

function observed(value, source) {
  return { value, status: 'OBSERVED', confidence: 1, evidence: { source } };
}

function unknown(reason) {
  return { value: null, status: 'UNKNOWN', confidence: 0, reason, evidence: null };
}

function firstEvidence(...items) {
  return items.find((item) => item.status === 'OBSERVED') || items.at(-1);
}

function normalizeFiles(files) {
  if (!Array.isArray(files)) return [];
  return files.map((file) => typeof file === 'string' ? file.replace(/\\/g, '/') : file?.path)
    .filter((file) => typeof file === 'string');
}

function normalizeHeaders(headers) {
  return Object.fromEntries(Object.entries(headers || {}).map(([key, value]) => [key.toLowerCase(), String(value)]));
}

function endpointOf(api) {
  return typeof api === 'string' ? api : String(api?.url || api?.endpoint || '');
}

function evidenceSource(item, fallback) {
  return typeof item?.evidenceSource === 'string' ? item.evidenceSource : fallback;
}

function routeValue(route) {
  return typeof route === 'string' ? route : route?.path || route?.url || route?.route || null;
}

function pathBase(file) {
  return file.slice(file.lastIndexOf('/') + 1);
}

const globalArchitectureDetector = new ArchitectureDetector();

module.exports = { ArchitectureDetector, globalArchitectureDetector };
