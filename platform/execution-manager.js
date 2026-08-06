const fs = require('fs/promises');
const path = require('path');
const MissionPackageBuilder = require('./mission-package-builder');
const IntelligenceAdapter = require('./intelligence/adapter');

class ExecutionManager {
    constructor(projectRoot, intelligenceClient) {
        this.projectRoot = projectRoot;
        this.intelligenceClient = intelligenceClient;
    }

    async validateExecutionPackage(pkg) {
        const required = ['schema', 'mission', 'goal', 'allowedFiles', 'checks', 'constraints', 'expectedOutput'];
        const errors = [];
        
        for (const req of required) {
            if (pkg[req] === undefined) {
                errors.push(`Missing required field: ${req}`);
            }
        }
        
        if (pkg.schema !== 'fenix.execution-package.v1') {
            errors.push('Invalid schema version');
        }
        if (pkg.mission && !pkg.mission.id) errors.push('Missing mission.id');
        
        return { valid: errors.length === 0, errors };
    }

    async runExecution(mission, agentName) {
        const pkg = MissionPackageBuilder.build(mission);
        
        // Strict Validation
        const validation = await this.validateExecutionPackage(pkg);
        if (!validation.valid) {
            throw new Error(`Execution Package Schema Validation Failed:\n${validation.errors.join('\n')}`);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const execDir = path.join(this.projectRoot, 'executions', mission.id, timestamp, agentName);
        await fs.mkdir(execDir, { recursive: true });

        // Salvar Execution Package
        await fs.writeFile(path.join(execDir, 'execution.json'), JSON.stringify(pkg, null, 2), 'utf8');

        // Chama Intelligence Service via Adapter
        let execResult;
        try {
            execResult = await IntelligenceAdapter.execute(pkg, agentName);
        } catch (e) {
            execResult = { error: e.message, patch: "", summary: "Error" };
        }

        // Salvar Resultado da IA (antigo patch.json, agora execution-result.json)
        await fs.writeFile(path.join(execDir, 'execution-result.json'), JSON.stringify(execResult, null, 2), 'utf8');

        // Retorna infos da execução para passar ao Review
        return {
            execDir,
            timestamp,
            agentName,
            patchArtifact: execResult
        };
    }

    async saveReview(execDir, decision) {
        await fs.writeFile(path.join(execDir, 'review.json'), JSON.stringify(decision, null, 2), 'utf8');
    }

    async saveValidatorResult(execDir, result) {
        await fs.writeFile(path.join(execDir, 'validator.json'), JSON.stringify(result, null, 2), 'utf8');
    }

    async saveResult(execDir, resultObj) {
        await fs.writeFile(path.join(execDir, 'result.json'), JSON.stringify(resultObj, null, 2), 'utf8');
    }

    async generateBenchmark(missionId) {
        const baseDir = path.join(this.projectRoot, 'executions', missionId);
        try {
            const timestamps = await fs.readdir(baseDir);
            const ranking = [];

            for (const ts of timestamps) {
                if (ts.endsWith('.json')) continue;
                const tsPath = path.join(baseDir, ts);
                const stat = await fs.stat(tsPath);
                if (stat.isDirectory()) {
                    const agents = await fs.readdir(tsPath);
                    for (const agent of agents) {
                        const agentPath = path.join(tsPath, agent);
                        try {
                            const resPath = path.join(agentPath, 'result.json');
                            const valPath = path.join(agentPath, 'validator.json');
                            const revPath = path.join(agentPath, 'review.json');
                            
                            const resObj = JSON.parse(await fs.readFile(resPath, 'utf8'));
                            const revObj = JSON.parse(await fs.readFile(revPath, 'utf8').catch(() => '{}'));
                            const valObj = JSON.parse(await fs.readFile(valPath, 'utf8').catch(() => '{}'));

                            const execResultObj = JSON.parse(await fs.readFile(path.join(agentPath, 'execution-result.json'), 'utf8').catch(() => '{}'));

                            // Weighted Score Calculation
                            let score = 0;
                            let testsPassed = resObj.tests?.passed || 0;
                            let testsFailed = resObj.tests?.failed || 0;
                            let execTimeMs = valObj.times?.total ? (valObj.times.total * 60000) : 0;
                            
                            if (resObj.status === 'VERIFIED_SUCCESS') {
                                score += 40; // 40% Tests
                                score += 20; // 20% Structural
                                score += 15; // 15% Scope
                                score += 10; // 10% Time (Assume base 10 for success)
                                score += 10; // 10% Review
                                score += 5;  // 5% Warnings
                            } else if (resObj.status === 'VALIDATED') {
                                score = 70;
                            } else if (resObj.status === 'FAILED') {
                                score = resObj.score || 0;
                            }
                            
                            ranking.push({
                                agent,
                                score,
                                status: resObj.status,
                                failedStage: resObj.failedStage || undefined,
                                executionTimeMs: execTimeMs,
                                tokensInput: execResultObj.tokensInput || 0,
                                tokensOutput: execResultObj.tokensOutput || 0,
                                warnings: execResultObj.warnings?.length || 0,
                                reviewIterations: revObj.iterations || 1,
                                retryCount: resObj.retryCount || 0,
                                patchSize: execResultObj.patch?.split('\\n').length || 0,
                                filesModified: execResultObj.patch ? (execResultObj.patch.match(/--- a\//g) || []).length : 0,
                                testsPassed,
                                testsFailed,
                                reviewApproved: revObj.approved || false
                            });
                        } catch (e) {}
                    }
                }
            }
            
            ranking.sort((a, b) => b.score - a.score);
            const winner = ranking.length > 0 && ranking[0].score > 0 ? ranking[0].agent : null;

            const benchmark = {
                mission: missionId,
                generatedAt: new Date().toISOString(),
                winner,
                ranking
            };
            
            await fs.writeFile(path.join(baseDir, 'benchmark.json'), JSON.stringify(benchmark, null, 2), 'utf8');
        } catch (e) {}
    }

    validateScope(pkg, execResult) {
        if (!execResult.patch) return { valid: false, reason: "Nenhum patch gerado" };
        
        // Simple heuristic: extract files modified from diff
        const filesMatch = execResult.patch.match(/--- a\/(.+)|b\/(.+)/g);
        if (filesMatch) {
            const modified = filesMatch.map(f => f.replace(/--- a\/|\+\+\+ b\//, '').trim());
            for (const file of modified) {
                // If it is changing a file that isn't allowed
                if (!pkg.allowedFiles.some(allowed => file.includes(allowed))) {
                    return { valid: false, reason: `Arquivo fora do escopo modificado: ${file}` };
                }
            }
        }
        return { valid: true };
    }

    validateArchitecture(execResult) {
        const forbiddenDirs = ['platform/runtime-v2', 'grg/src/kernel-v2'];
        const filesMatch = execResult.patch ? execResult.patch.match(/--- a\/(.+)|b\/(.+)/g) : [];
        if (filesMatch) {
            const modified = filesMatch.map(f => f.replace(/--- a\/|\+\+\+ b\//, '').trim());
            for (const file of modified) {
                for (const dir of forbiddenDirs) {
                    if (file.startsWith(dir)) {
                        return { valid: false, reason: `Criação de diretório proibido (Architecture Freeze): ${dir}` };
                    }
                }
            }
        }
        return { valid: true };
    }
}

module.exports = ExecutionManager;
