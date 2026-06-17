import type {
  AtlassianClient,
  ConfluencePage,
  JiraStory,
  JiraStorySummary,
} from "./types";

/** Sample data for local development when no Atlassian connection is configured. */
export class MockAtlassianClient implements AtlassianClient {
  readonly mode = "mock" as const;

  async getStory(key: string): Promise<JiraStory> {
    return {
      key,
      title: "Customer can search and book a flight",
      description:
        "As a traveler I want to search flights by origin, destination and date " +
        "so that I can book the cheapest option.",
      acceptanceCriteria: [
        "Given valid search inputs, matching flights are listed cheapest-first",
        "When no flights match, an empty-state message is shown",
        "Booking a flight decrements available seats and shows a confirmation",
      ],
      status: "In Progress",
      url: `https://example.atlassian.net/browse/${key}`,
    };
  }

  async searchStories(_jql: string): Promise<JiraStorySummary[]> {
    return [
      { key: "FB-101", title: "Customer can search and book a flight", status: "In Progress" },
      { key: "FB-102", title: "Apply promo code at checkout", status: "To Do" },
    ];
  }

  async getConfluencePage(id: string): Promise<ConfluencePage> {
    return {
      id,
      title: "Booking flow — product spec",
      body: "The booking flow consists of search, select, passenger details, and confirmation.",
      url: `https://example.atlassian.net/wiki/pages/${id}`,
    };
  }

  async searchConfluence(_query: string): Promise<ConfluencePage[]> {
    return [await this.getConfluencePage("12345")];
  }
}
