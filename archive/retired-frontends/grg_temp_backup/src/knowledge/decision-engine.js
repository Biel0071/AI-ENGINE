class DecisionEngine {
  constructor(experienceStore, patternStore, vectorStore) {
    this.experienceStore = experienceStore;
    this.patternStore = patternStore;
    this.vectorStore = vectorStore;
  }

  async askForAdvice(goal, context = {}) {
    // 1. Search semantic memory for related experiences
    const similarExperiences = await this.vectorStore.semanticSearch(goal, 5);
    
    // 2. Filter and rank experiences by confidence
    let approvedPatterns = [];
    let toAvoid = [];
    
    // If vector search is not fully semantic yet, we can do a naive keyword search for MVP
    let allExperiences = [];
    try {
      allExperiences = await this.experienceStore.find({}); // Retrieve all for filtering (SQLite fallback)
    } catch (e) {
      allExperiences = [];
    }

    // Rank experiences based on success rate and confidence
    const ranked = allExperiences
      .filter(exp => exp.topic.includes(goal) || exp.domain === context.domain)
      .sort((a, b) => b.confidence - a.confidence);

    for (const exp of ranked) {
      if (exp.recommended && exp.confidence > 0.7) {
        approvedPatterns.push(exp);
      }
      if (exp.avoid || exp.confidence < 0.4) {
        toAvoid.push(exp);
      }
    }

    // 3. Search Pattern Library
    let recommendedPattern = null;
    try {
      const patterns = await this.patternStore.find({ domain: context.domain || goal });
      if (patterns.length > 0) {
        recommendedPattern = patterns[0]; // Take highest ranked pattern
      }
    } catch (e) {
      // ignore
    }

    return {
      experiencesFound: ranked.length,
      highestSuccessRate: approvedPatterns.slice(0, 3).map(p => p.pattern),
      doNotRepeat: toAvoid.slice(0, 3).map(p => p.reason || p.pattern),
      recommendedPattern: recommendedPattern ? recommendedPattern.name : null,
      context: "DecisionEngine distilled these guidelines based on past mission executions."
    };
  }

  // Updates the learning score based on a pattern's repeated success/failure
  async updateLearningScore(patternName, success) {
    const experiences = await this.experienceStore.find({ pattern: patternName });
    if (experiences.length === 0) return;

    let successes = 0;
    let total = experiences.length;
    
    for (const exp of experiences) {
      if (exp.result === 'SUCCESS') successes++;
    }

    // Adjust based on the new outcome
    total++;
    if (success) successes++;

    const newConfidence = successes / total;

    // Update all relevant experiences with the new consolidated confidence (simplification)
    for (const exp of experiences) {
      exp.confidence = newConfidence;
      await this.experienceStore.set(exp.experience_id, exp);
    }
  }
}

module.exports = { DecisionEngine };
