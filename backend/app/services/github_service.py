import os
from dotenv import load_dotenv
import httpx

load_dotenv()




GRAPHQL_QUERY = """
query($username: String!, $reposCursor: String) {
  user(login: $username) {

    pinnedItems(first: 6, types: REPOSITORY) {
      nodes {
        ... on Repository {
          name
          description
          stargazerCount
          primaryLanguage {
            name
          }
          repositoryTopics(first: 10) {
            nodes {
              topic {
                name
              }
            }
          }
          languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
            nodes {
              name
            }
          }
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: 10) {
                  totalCount
                  nodes {
                    oid
                    message
                    committedDate
                    author {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    repositories(first: 100, after: $reposCursor, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        name
        isFork
        stargazerCount

        primaryLanguage {
          name
        }

        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          nodes {
            name
          }
        }

        repositoryTopics(first: 10) {
          nodes {
            topic {
              name
            }
          }
        }
      }

      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
"""


def github_headers() -> dict[str, str]:
    github_token = os.getenv("GITHUB_TOKEN")
    return {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github+json",
    }


async def fetch_user_events(client: httpx.AsyncClient, username: str) -> list[dict]:
    response = await client.get(
        f"https://api.github.com/users/{username}/events",
        headers=github_headers(),
        params={"per_page": 100},
    )
    response.raise_for_status()

    events_data = response.json()
    if not isinstance(events_data, list):
        raise ValueError("Unexpected GitHub events response format.")

    return events_data


async def fetch_user_repos_and_pinned(client: httpx.AsyncClient, username: str) -> tuple[list[dict], list[dict]]:
    all_repos: list[dict] = []
    pinned_items: list[dict] = []
    cursor = None

    while True:
        variables = {"username": username, "reposCursor": cursor}
        response = await client.post(
            "https://api.github.com/graphql",
            headers={**github_headers(), "Content-Type": "application/json"},
            json={"query": GRAPHQL_QUERY, "variables": variables},
        )
        response.raise_for_status()

        gql_data = response.json()
        if "errors" in gql_data:
            raise ValueError(gql_data["errors"])

        user_data = gql_data["data"]["user"]
        pinned_items = user_data["pinnedItems"]["nodes"]
        all_repos.extend(user_data["repositories"]["nodes"])

        page_info = user_data["repositories"]["pageInfo"]
        if not page_info["hasNextPage"]:
            break
        cursor = page_info["endCursor"]

    return all_repos, pinned_items


async def fetch_public_user_info(username: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.github.com/users/{username}",
            headers=github_headers(),
        )
        response.raise_for_status()
        return response.json()
