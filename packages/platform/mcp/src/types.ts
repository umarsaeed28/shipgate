export interface JiraStory {
  key: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: string;
  url: string;
}

export interface JiraStorySummary {
  key: string;
  title: string;
  status: string;
}

export interface ConfluencePage {
  id: string;
  title: string;
  body: string;
  url: string;
}

export interface AtlassianCredentials {
  /** e.g. https://acme.atlassian.net */
  siteUrl: string;
  email: string;
  /** Atlassian API token (headless). Encrypted at rest; decrypted in memory. */
  token: string;
}

export interface AtlassianClient {
  readonly mode: "rest" | "mock";
  getStory(key: string): Promise<JiraStory>;
  searchStories(jql: string): Promise<JiraStorySummary[]>;
  getConfluencePage(id: string): Promise<ConfluencePage>;
  searchConfluence(query: string): Promise<ConfluencePage[]>;
}
