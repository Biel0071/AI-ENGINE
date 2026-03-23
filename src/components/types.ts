export interface FeatureEntity {
  name: string;
  fields: string[];
  description: string;
}

export interface FeatureAction {
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  route: string;
}

export interface FeatureUIScreen {
  name: string;
  description: string;
  components: string[];
}

export interface BusinessRule {
  id: string;
  description: string;
}

export interface FeatureDefinition {
  feature: string;
  featureName: string;
  modules: string[];
  backend: string[];
  frontend: string[];
  entities: FeatureEntity[];
  actions: FeatureAction[];
  uiScreens: FeatureUIScreen[];
  businessRules: BusinessRule[];
  style: {
    theme: 'dark';
    lookAndFeel: string;
  };
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerationResult {
  prompt: string;
  interpretedFeature: FeatureDefinition;
  outputRoot: string;
  filesWritten: string[];
}
