import asyncio
import os
from dotenv import load_dotenv
import httpx

load_dotenv()




GITHUB_REQUEST_TIMEOUT = httpx.Timeout(30.0, connect=10.0)



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
        description
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


async def _request_json_with_retries(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    *,
    max_attempts: int = 3,
    retry_statuses: tuple[int, ...] = (502, 503, 504),
    **kwargs,
) -> dict | list:
    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            response = await client.request(method, url, **kwargs)
            if response.status_code in retry_statuses and attempt < max_attempts:
                last_error = httpx.HTTPStatusError(
                    f"GitHub returned {response.status_code} for {url}",
                    request=response.request,
                    response=response,
                )
                await asyncio.sleep(0.5 * attempt)
                continue

            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, (dict, list)):
                raise ValueError("Unexpected GitHub response format.")
            return payload
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            last_error = exc
            if attempt < max_attempts:
                await asyncio.sleep(0.5 * attempt)
                continue
            raise
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code in retry_statuses and attempt < max_attempts:
                last_error = exc
                await asyncio.sleep(0.5 * attempt)
                continue
            raise

    if last_error:
        raise last_error
    raise RuntimeError("GitHub request failed without a response.")


async def fetch_user_events(client: httpx.AsyncClient, username: str) -> list[dict]:
    events_data = await _request_json_with_retries(
        client,
        "GET",
        f"https://api.github.com/users/{username}/events",
        headers=github_headers(),
        params={"per_page": 100},
    )
    if not isinstance(events_data, list):
        raise ValueError("Unexpected GitHub events response format.")

    return events_data


async def fetch_user_repos_and_pinned(client: httpx.AsyncClient, username: str) -> tuple[list[dict], list[dict]]:
    all_repos: list[dict] = []
    pinned_items: list[dict] = []
    cursor = None

    while True:
        variables = {"username": username, "reposCursor": cursor}
        gql_data = await _request_json_with_retries(
            client,
            "POST",
            "https://api.github.com/graphql",
            headers={**github_headers(), "Content-Type": "application/json"},
            json={"query": GRAPHQL_QUERY, "variables": variables},
        )
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
    async with httpx.AsyncClient(timeout=GITHUB_REQUEST_TIMEOUT) as client:
        payload = await _request_json_with_retries(
            client,
            "GET",
            f"https://api.github.com/users/{username}",
            headers=github_headers(),
        )
        if not isinstance(payload, dict):
            raise ValueError("Unexpected GitHub profile response format.")
        return payload
